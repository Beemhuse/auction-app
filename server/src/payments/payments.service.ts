import { createHmac, timingSafeEqual } from 'node:crypto';
import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Auction, AuctionRegistration, DepositStatus, PaymentAttempt, PaymentAttemptStatus, PaymentEvent } from '../database/entities';
import { EntryCodeService } from '../registrations/entry-code.service';
import { PaystackChargeDataDto, PaystackWebhookDto } from './dto';
import { PaystackService } from '../integrations/paystack/paystack.service';
import { TelegramBotService } from '../telegram/telegram-bot.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  constructor(private readonly config: ConfigService, private readonly dataSource: DataSource, private readonly codes: EntryCodeService, private readonly telegram: TelegramBotService, private readonly paystack: PaystackService) {}
  async processWebhook(rawBody: Buffer, signature: string, input: unknown) {
    const expected = createHmac('sha512', this.config.getOrThrow<string>('PAYSTACK_SECRET_KEY')).update(rawBody).digest();
    let actual: Buffer;
    try { actual = Buffer.from(signature, 'hex'); } catch { throw new UnauthorizedException('Invalid webhook signature'); }
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new UnauthorizedException('Invalid webhook signature');
    const event = this.parsePaystackEvent(input);
    const processed = await this.confirmCharge(event.data);
    return processed.duplicate ? { received: true, duplicate: true } : { received: true };
  }

  /**
   * Admin recovery for a payment whose webhook never arrived: asks Paystack directly (an authenticated
   * call) and, when it reports success, confirms the deposit exactly as the webhook would. Safe to
   * repeat; an already confirmed payment just re-sends the entry code.
   */
  async reconcile(reference: string) {
    const transaction = await this.paystack.verifyTransaction(reference);
    if (!transaction) throw new NotFoundException('Paystack has no record of this payment reference');
    if (transaction.status !== 'success') return { confirmed: false, paystackStatus: transaction.status };
    const processed = await this.confirmCharge({ id: Number(transaction.id), reference: transaction.reference, status: 'success', amount: Number(transaction.amount), currency: transaction.currency });
    if (!processed.duplicate) this.logger.warn(`Confirmed ${reference} by admin verification; its webhook never arrived`);
    return { confirmed: true, paystackStatus: transaction.status, duplicate: processed.duplicate };
  }

  /** Marks the deposit held and sends the entry code. Idempotent per Paystack charge id. */
  private async confirmCharge(charge: PaystackChargeDataDto) {
    const processed = await this.dataSource.transaction(async (manager) => {
      const providerEventId = `paystack:charge.success:${charge.id}`;
      if (await manager.existsBy(PaymentEvent, { providerEventId })) {
        const attempt = await manager.findOneBy(PaymentAttempt, { reference: charge.reference });
        const registration = attempt ? await manager.findOneBy(AuctionRegistration, { id: attempt.registrationId }) : null;
        if (!registration || registration.depositStatus !== DepositStatus.HELD) return { duplicate: true as const, delivery: null };
        const auction = await manager.findOneByOrFail(Auction, { id: registration.auctionId });
        return { duplicate: true as const, delivery: { registration, auction, code: this.codes.generate(registration.id) } };
      }
      const attempt = await manager.findOne(PaymentAttempt, { where: { reference: charge.reference }, lock: { mode: 'pessimistic_write' } });
      if (!attempt) throw new NotFoundException('Payment reference not found');
      const registration = await manager.findOne(AuctionRegistration, { where: { id: attempt.registrationId }, lock: { mode: 'pessimistic_write' } });
      if (!registration) throw new NotFoundException('Payment reference not found');
      const auction = await manager.findOneByOrFail(Auction, { id: registration.auctionId });
      if (String(charge.amount) !== auction.depositAmountMinor || charge.currency.toUpperCase() !== auction.currency) throw new BadRequestException('Payment amount or currency mismatch');
      registration.depositStatus = DepositStatus.HELD;
      const code = this.codes.generate(registration.id);
      registration.entryCodeDigest = this.codes.digest(code);
      await manager.save(registration);
      attempt.status = PaymentAttemptStatus.PAID;
      await manager.save(attempt);
      await manager.save(PaymentEvent, manager.create(PaymentEvent, { providerEventId, paymentReference: charge.reference, amountMinor: String(charge.amount), currency: charge.currency.toUpperCase() }));
      return { duplicate: false as const, delivery: { registration, auction, code } };
    });
    if (processed.delivery) await this.telegram.sendEntryCode(processed.delivery.registration.telegramUserId, processed.delivery.auction, processed.delivery.code);
    return processed;
  }

  private parsePaystackEvent(input: unknown): PaystackWebhookDto {
    if (!input || typeof input !== 'object') throw new BadRequestException('Invalid Paystack event');
    const candidate = input as { event?: unknown; data?: Record<string, unknown> };
    const data = candidate.data;
    if (candidate.event !== 'charge.success' || !data || data.status !== 'success' || typeof data.reference !== 'string' || typeof data.currency !== 'string' || typeof data.amount !== 'number' || !Number.isSafeInteger(data.amount) || data.amount < 1 || (typeof data.id !== 'number' && typeof data.id !== 'string')) {
      throw new BadRequestException('Invalid Paystack charge event');
    }
    return { event: 'charge.success', data: { id: Number(data.id), reference: data.reference, status: 'success', amount: data.amount, currency: data.currency } };
  }
}
