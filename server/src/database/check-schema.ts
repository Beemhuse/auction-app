import 'dotenv/config';
import dataSource from './data-source';
import { AuctionRegistration, PaymentAttempt } from './entities';

async function checkSchema(): Promise<void> {
  await dataSource.initialize();
  await dataSource.getRepository(AuctionRegistration).find({ take: 1 });
  await dataSource.getRepository(PaymentAttempt).find({ take: 1 });
  await dataSource.destroy();
  console.log('Database entity mappings are valid');
}

void checkSchema().catch((error) => { console.error(error); process.exitCode = 1; });
