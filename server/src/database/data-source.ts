import 'dotenv/config';
import { DataSource } from 'typeorm';
import { databaseSsl } from './ssl';
import { Auction, AuctionRegistration, AuctionResult, Bid, PaymentAttempt, PaymentEvent, TelegramUser } from './entities';
import { InitialSchema1727000000000 } from './migrations/1727000000000-InitialSchema';
import { AddRegistrationEmail1727000001000 } from './migrations/1727000001000-AddRegistrationEmail';
import { AddPaymentAttempts1727000002000 } from './migrations/1727000002000-AddPaymentAttempts';
import { AddAuctionResultsAndTelegramUsers1727000003000 } from './migrations/1727000003000-AddAuctionResultsAndTelegramUsers';

export default new DataSource({
  type: 'postgres', url: process.env.DATABASE_URL, ssl: databaseSsl(process.env.DATABASE_SSL),
  entities: [Auction, AuctionRegistration, AuctionResult, Bid, PaymentAttempt, PaymentEvent, TelegramUser],
  migrations: [InitialSchema1727000000000, AddRegistrationEmail1727000001000, AddPaymentAttempts1727000002000, AddAuctionResultsAndTelegramUsers1727000003000], synchronize: false,
});
