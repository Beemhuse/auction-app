import 'dotenv/config';
import dataSource from './data-source';
import { Auction, AuctionStatus } from './entities';

async function seed(): Promise<void> {
  await dataSource.initialize();
  const auctions = dataSource.getRepository(Auction);
  const id = '11111111-1111-4111-8111-111111111111';
  const now = Date.now();
  const existing = await auctions.findOneBy({ id });
  await auctions.save(auctions.create({
    ...existing,
    id,
    title: 'Ulora Founders Collection',
    currency: 'NGN',
    startingPriceMinor: '10000000',
    reservePriceMinor: '15000000',
    depositAmountMinor: '2000000',
    minIncrementMinor: '500000',
    status: AuctionStatus.SCHEDULED,
    startsAt: new Date(now + 24 * 60 * 60_000),
    endsAt: new Date(now + 25 * 60 * 60_000),
    effectiveEndsAt: new Date(now + 25 * 60 * 60_000),
  }));
  await dataSource.destroy();
  console.log(`Seeded development auction ${id}`);
}

void seed().catch((error) => { console.error(error); process.exitCode = 1; });
