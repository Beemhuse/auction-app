import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auction, AuctionRegistration, AuctionStatus, Bid, DepositStatus } from '../database/entities';
import { CreateAuctionDto, UpdateAuctionDto } from './admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Auction) private readonly auctions: Repository<Auction>,
    @InjectRepository(AuctionRegistration) private readonly registrations: Repository<AuctionRegistration>,
    @InjectRepository(Bid) private readonly bids: Repository<Bid>,
  ) {}

  async overview() {
    const auctions = await this.auctions.find({ order: { startsAt: 'DESC' } });
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
      return { ...auction, registrationCount, paidCount, bidCount, highestBidMinor: highest?.amountMinor ?? null };
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
    if (input.status !== undefined) auction.status = input.status;
    if (input.startsAt !== undefined) auction.startsAt = new Date(input.startsAt);
    if (input.endsAt !== undefined) {
      auction.endsAt = new Date(input.endsAt);
      auction.effectiveEndsAt = new Date(input.endsAt);
    }
    return this.auctions.save(auction);
  }

  async registrationsFor(auctionId: string): Promise<AuctionRegistration[]> {
    await this.requireAuction(auctionId);
    return this.registrations.find({ where: { auctionId }, order: { createdAt: 'DESC' } });
  }

  async bidsFor(auctionId: string): Promise<Bid[]> {
    await this.requireAuction(auctionId);
    return this.bids.find({ where: { auctionId }, order: { sequence: 'DESC' }, take: 500 });
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
