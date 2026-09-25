import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auction, AuctionRegistration, AuctionResult, Bid, DepositRefund } from '../database/entities';
import { PaymentsModule } from '../payments/payments.module';
import { TelegramModule } from '../telegram/telegram.module';
import { AdminController } from './admin.controller';
import { AdminKeyGuard } from './admin-key.guard';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([Auction, AuctionRegistration, AuctionResult, Bid, DepositRefund]), PaymentsModule, TelegramModule],
  controllers: [AdminController],
  providers: [AdminService, AdminKeyGuard],
})
export class AdminModule {}
