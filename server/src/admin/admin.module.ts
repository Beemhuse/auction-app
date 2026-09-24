import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auction, AuctionRegistration, Bid } from '../database/entities';
import { AdminController } from './admin.controller';
import { AdminKeyGuard } from './admin-key.guard';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([Auction, AuctionRegistration, Bid])],
  controllers: [AdminController],
  providers: [AdminService, AdminKeyGuard],
})
export class AdminModule {}
