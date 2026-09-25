import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Auction, AuctionRegistration, AuctionResult, AuctionStatus, Bid, DepositRefund, DepositStatus } from '../database/entities';
import { CreateAuctionDto, SendUserMessageDto, UpdateAuctionDto } from './admin.dto';
import { TelegramUsersService, describeTelegramUser } from '../auth/telegram-users.service';
import { TelegramBotService, adminMessage } from '../telegram/telegram-bot.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Auction) private readonly auctions: Repository<Auction>,
    @InjectRepository(AuctionRegistration) private readonly registrations: Repository<AuctionRegistration>,
    @InjectRepository(Bid) private readonly bids: Repository<Bid>,
    @InjectRepository(AuctionResult) private readonly results: Repository<AuctionResult>,
    @InjectRepository(DepositRefund) private readonly refunds: Repository<DepositRefund>,
    private readonly payments: PaymentsService,
    private readonly telegramUsers: TelegramUsersService,
    private readonly telegram: TelegramBotService,
  ) {}

  async overview() {
    const auctions = await this.auctions.find({ order: { startsAt: 'DESC' } });
    const results = auctions.length ? await this.results.findBy({ auctionId: In(auctions.map((auction) => auction.id)) }) : [];
    const winners = await this.telegramUsers.findMany(results.flatMap((result) => result.winnerTelegramUserId ?? []));
    const resultFor = new Map(results.map((result) => [result.auctionId, { ...result, ...prefixWinner(describeTelegramUser(winners.get(result.winnerTelegramUserId ?? ''))) }]));
    const rows = await Promise.all(auctions.map(async (auction) => {
      const [registrationCount, paidCount, bidCount, highest] = await Promise.all([
        this.registrations.countBy({ auctionId: auction.id }),
        this.registrations.count({ where: [
          { auctionId: auction.id, depositStatus: DepositStatus.HELD },
          { auctionId: auction.id, depositStatus: DepositStatus.APPLIED },
        ] }),
        this.bids.countBy({ auctionId: auction.id }),
        this.bids.findOne({ where: { auctionId: auction.id }, order: { sequence: 'DESC' } }),
      ]);
      return { ...auction, registrationCount, paidCount, bidCount, highestBidMinor: highest?.amountMinor ?? null, result: resultFor.get(auction.id) ?? null };
    }));
    return {
      totals: {
        auctions: rows.length,
        active: rows.filter((auction) => auction.status === AuctionStatus.ACTIVE).length,
        registrations: rows.reduce((sum, auction) => sum + auction.registrationCount, 0),
        bids: rows.reduce((sum, auction) => sum + auction.bidCount, 0),
      },
      auctions: rows,
    };
  }

  async create(input: CreateAuctionDto): Promise<Auction> {
    this.assertSchedule(input.startsAt, input.endsAt);
    return this.auctions.save(this.auctions.create({
      ...input,
      status: input.status ?? AuctionStatus.SCHEDULED,
      reservePriceMinor: input.reservePriceMinor || null,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      effectiveEndsAt: new Date(input.endsAt),
    }));
  }

  async update(id: string, input: UpdateAuctionDto): Promise<Auction> {
    const auction = await this.auctions.findOneBy({ id });
    if (!auction) throw new NotFoundException('Auction not found');
    const startsAt = input.startsAt ?? auction.startsAt.toISOString();
    const endsAt = input.endsAt ?? auction.endsAt.toISOString();
    this.assertSchedule(startsAt, endsAt);

    if (input.title !== undefined) auction.title = input.title;
    if (input.currency !== undefined) auction.currency = input.currency;
    if (input.startingPriceMinor !== undefined) auction.startingPriceMinor = input.startingPriceMinor;
    if (input.reservePriceMinor !== undefined) auction.reservePriceMinor = input.reservePriceMinor || null;
    if (input.depositAmountMinor !== undefined) auction.depositAmountMinor = input.depositAmountMinor;
    if (input.minIncrementMinor !== undefined) auction.minIncrementMinor = input.minIncrementMinor;
    // Reopening a closed auction discards its result, so it is decided and announced again when it ends.
    if (input.status !== undefined && input.status !== AuctionStatus.CLOSED && auction.status === AuctionStatus.CLOSED) await this.results.delete({ auctionId: id });
    if (input.status !== undefined) auction.status = input.status;
    if (input.startsAt !== undefined) auction.startsAt = new Date(input.startsAt);
    if (input.endsAt !== undefined) {
      auction.endsAt = new Date(input.endsAt);
      auction.effectiveEndsAt = new Date(input.endsAt);
    }
    return this.auctions.save(auction);
  }

  async registrationsFor(auctionId: string) {
    await this.requireAuction(auctionId);
    const registrations = await this.withProfiles(await this.registrations.find({ where: { auctionId }, order: { createdAt: 'DESC' } }));
    const refunds = registrations.length ? await this.refunds.findBy({ registrationId: In(registrations.map((row) => row.id)) }) : [];
    const refundFor = new Map(refunds.map((refund) => [refund.registrationId, { id: refund.id, status: refund.status, amountMinor: refund.amountMinor, customerDetails: refund.customerDetails, updatedAt: refund.updatedAt }]));
    return registrations.map((row) => ({ ...row, refund: refundFor.get(row.id) ?? null }));
  }

  async bidsFor(auctionId: string) {
    await this.requireAuction(auctionId);
    return this.withProfiles(await this.bids.find({ where: { auctionId }, order: { sequence: 'DESC' }, take: 500 }));
  }

  /** Sends an admin's message through the bot to someone registered for this auction. */
  async messageUser(auctionId: string, input: SendUserMessageDto) {
    const auction = await this.auctions.findOneBy({ id: auctionId });
    if (!auction) throw new NotFoundException('Auction not found');
    if (!await this.registrations.existsBy({ auctionId, telegramUserId: input.telegramUserId })) throw new BadRequestException('This user is not registered for this auction');
    try {
      await this.telegram.sendText(input.telegramUserId, adminMessage(auction, input.text));
    } catch (error) {
      throw new BadGatewayException(error instanceof Error ? error.message : 'Could not send the message');
    }
    return { sent: true };
  }

  private async withProfiles<T extends { telegramUserId: string }>(rows: T[]) {
    const users = await this.telegramUsers.findMany(rows.map((row) => row.telegramUserId));
    return rows.map((row) => ({ ...row, ...describeTelegramUser(users.get(row.telegramUserId)) }));
  }

  /** Checks the registration's payment with Paystack and confirms it if the webhook was missed. */
  async verifyPayment(registrationId: string) {
    const registration = await this.registrations.findOneBy({ id: registrationId });
    if (!registration) throw new NotFoundException('Registration not found');
    if (!registration.paymentReference) throw new BadRequestException('This registration has no payment to verify');
    return this.payments.reconcile(registration.paymentReference);
  }

  private assertSchedule(startsAtValue: string, endsAtValue: string): void {
    const startsAt = new Date(startsAtValue);
    const endsAt = new Date(endsAtValue);
    if (startsAt.getTime() >= endsAt.getTime()) throw new BadRequestException('Auction end time must be after its start time');
  }

  private async requireAuction(id: string): Promise<void> {
    if (!await this.auctions.existsBy({ id })) throw new NotFoundException('Auction not found');
  }
}

function prefixWinner({ telegramUsername, telegramName }: ReturnType<typeof describeTelegramUser>) {
  return { winnerUsername: telegramUsername, winnerName: telegramName };
}
