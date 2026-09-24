import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Auction, AuctionRegistration, DepositStatus, PaymentAttempt, PaymentAttemptStatus } from '../database/entities';
import { isRegistrationOpen } from '../auctions/registration-window';
import { roomTokenExpiry } from '../auctions/auction-timing';
import { EntryCodeService } from './entry-code.service';
import { RoomTokenService } from '../auth/room-token.service';
import { randomUUID } from 'node:crypto';
import { PaystackService } from '../integrations/paystack/paystack.service';
import { TelegramLinkService } from '../telegram/telegram-link.service';

/** Paystack says money has moved or is moving: never issue another checkout, wait for the webhook. */
const PAID_OR_IN_FLIGHT = new Set(['success', 'pending', 'processing', 'queued']);
/** Paystack says this transaction is finished without payment: its link cannot be used again. */
const DEAD = new Set(['failed', 'reversed']);

type CheckoutDecision = 'reuse' | 'awaiting-confirmation' | 'replace';

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);
  constructor(
    @InjectRepository(Auction) private readonly auctions: Repository<Auction>,
    @InjectRepository(AuctionRegistration) private readonly registrations: Repository<AuctionRegistration>,
    @InjectRepository(PaymentAttempt) private readonly paymentAttempts: Repository<PaymentAttempt>,
    private readonly dataSource: DataSource, private readonly codes: EntryCodeService, private readonly roomTokens: RoomTokenService, private readonly paystack: PaystackService,
    private readonly telegramLinks: TelegramLinkService,
  ) {}
  async create(auctionId: string, telegramUserId: string, email: string) {
    const auction = await this.auctions.findOneBy({ id: auctionId });
    if (!auction) throw new NotFoundException('Auction not found');
    if (!isRegistrationOpen(auction)) throw new BadRequestException('Registration is closed');
    let registration = await this.registrations.findOneBy({ auctionId, telegramUserId });
    if (!registration) {
      registration = this.registrations.create({ auctionId, telegramUserId, payerEmail: email.toLowerCase(), paymentReference: null });
      registration = await this.registrations.save(registration);
    } else if (registration.payerEmail !== email.toLowerCase() && registration.depositStatus === DepositStatus.PENDING) {
      registration.payerEmail = email.toLowerCase();
      registration = await this.registrations.save(registration);
    }
    if (registration.depositStatus !== DepositStatus.PENDING) return { registrationId: registration.id, checkoutUrl: '', status: registration.depositStatus, awaitingConfirmation: false };
    const reusable = await this.paymentAttempts.findOne({ where: { registrationId: registration.id, status: PaymentAttemptStatus.PENDING }, order: { createdAt: 'DESC' } });
    if (reusable?.checkoutUrl) {
      const decision = await this.decideCheckout(reusable);
      if (decision === 'reuse') return { registrationId: registration.id, checkoutUrl: reusable.checkoutUrl, status: registration.depositStatus, awaitingConfirmation: false };
      if (decision === 'awaiting-confirmation') return { registrationId: registration.id, checkoutUrl: '', status: registration.depositStatus, awaitingConfirmation: true };
    }

    const attempt = await this.paymentAttempts.save(this.paymentAttempts.create({ registrationId: registration.id, reference: `HMR-${randomUUID().replaceAll('-', '')}`, status: PaymentAttemptStatus.INITIALIZING }));
    registration.paymentReference = attempt.reference;
    await this.registrations.save(registration);
    try {
      const callbackUrl = await this.telegramLinks.paymentReturnUrl(attempt.reference);
      const checkout = await this.paystack.initialize({ email: registration.payerEmail, amountMinor: auction.depositAmountMinor, currency: auction.currency, reference: attempt.reference, auctionId, registrationId: registration.id, callbackUrl });
      attempt.checkoutUrl = checkout.checkoutUrl;
      attempt.status = PaymentAttemptStatus.PENDING;
      await this.paymentAttempts.save(attempt);
      return { registrationId: registration.id, checkoutUrl: checkout.checkoutUrl, status: registration.depositStatus, awaitingConfirmation: false };
    } catch (error) {
      attempt.status = PaymentAttemptStatus.FAILED;
      await this.paymentAttempts.save(attempt);
      throw error;
    }
  }
  /**
   * Asks Paystack whether a pending checkout link is still usable. This never changes the deposit:
   * a paid transaction stays PENDING here until the signed webhook confirms it.
   */
  private async decideCheckout(attempt: PaymentAttempt): Promise<CheckoutDecision> {
    let status: string | null;
    try {
      status = await this.paystack.transactionStatus(attempt.reference);
    } catch {
      this.logger.warn(`Could not check Paystack status for ${attempt.reference}; reusing its checkout link`);
      return 'reuse';
    }
    if (status && PAID_OR_IN_FLIGHT.has(status)) {
      this.logger.warn(`Paystack reports ${attempt.reference} as ${status} but no webhook has confirmed it; check the Paystack webhook URL`);
      return 'awaiting-confirmation';
    }
    if (status && DEAD.has(status)) {
      attempt.status = PaymentAttemptStatus.FAILED;
      await this.paymentAttempts.save(attempt);
      return 'replace';
    }
    return 'reuse'; // not opened yet, abandoned, or ongoing: the link still works
  }
  /** Read-only status for a payer returning from checkout. Returns null unless the reference belongs to this Telegram user. */
  async paymentReturn(reference: string, telegramUserId: string) {
    const attempt = await this.paymentAttempts.findOneBy({ reference });
    const registration = attempt ? await this.registrations.findOneBy({ id: attempt.registrationId }) : null;
    if (!registration || registration.telegramUserId !== telegramUserId) return null;
    const auction = await this.auctions.findOneByOrFail({ id: registration.auctionId });
    const confirmed = registration.depositStatus === DepositStatus.HELD && Boolean(registration.entryCodeDigest);
    return {
      auction,
      depositStatus: registration.depositStatus,
      redeemed: Boolean(registration.codeRedeemedAt),
      entryCode: confirmed && !registration.codeRedeemedAt ? this.codes.generate(registration.id) : null,
    };
  }
  async redeem(auctionId: string, telegramUserId: string, code: string) {
    return this.dataSource.transaction(async (manager) => {
      const registration = await manager.findOne(AuctionRegistration, { where: { auctionId, telegramUserId }, lock: { mode: 'pessimistic_write' } });
      if (!registration || registration.depositStatus !== DepositStatus.HELD || !registration.entryCodeDigest) throw new NotFoundException('Active registration not found');
      if (!this.codes.matches(code, registration.entryCodeDigest)) throw new BadRequestException('Invalid entry code');
      if (registration.codeRedeemedAt) throw new ConflictException('Entry code has already been redeemed');
      const auction = await manager.findOneByOrFail(Auction, { id: auctionId });
      registration.codeRedeemedAt = new Date(); await manager.save(registration);
      return this.admission(registration, auction);
    });
  }
  /** The caller's registrations, newest first, so a client can show where they stand in each auction. */
  async mine(telegramUserId: string) {
    const rows = await this.registrations.find({ where: { telegramUserId }, order: { createdAt: 'DESC' } });
    return rows.map((registration) => ({
      registrationId: registration.id,
      auctionId: registration.auctionId,
      depositStatus: registration.depositStatus,
      admitted: Boolean(registration.codeRedeemedAt),
      createdAt: registration.createdAt,
    }));
  }
  /** Fresh room token for a bidder who already redeemed their code (the code itself is single-use). */
  async roomToken(auctionId: string, telegramUserId: string) {
    const registration = await this.registrations.findOneBy({ auctionId, telegramUserId });
    if (!registration || registration.depositStatus !== DepositStatus.HELD || !registration.codeRedeemedAt) throw new NotFoundException('Admitted registration not found');
    const auction = await this.auctions.findOneByOrFail({ id: auctionId });
    return this.admission(registration, auction);
  }
  private admission(registration: AuctionRegistration, auction: Auction) {
    const expiresAt = roomTokenExpiry(auction);
    return { auctionId: auction.id, registrationId: registration.id, admitted: true, expiresAt, roomToken: this.roomTokens.issue(registration.telegramUserId, auction.id, expiresAt) };
  }
}
