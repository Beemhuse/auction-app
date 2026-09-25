import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auction, AuctionRegistration, AuctionResult, Bid } from '../database/entities';
import { BiddingController } from './bidding.controller';
import { BiddingService } from './bidding.service';
import { redisProvider } from './redis.provider';
import { AuctionEventsService } from './auction-events.service';
import { AuctionGateway } from './auction.gateway';
import { AuctionCloserService } from './auction-closer.service';
import { TelegramModule } from '../telegram/telegram.module';

@Module({ imports: [TypeOrmModule.forFeature([Auction, AuctionRegistration, AuctionResult, Bid]), TelegramModule], controllers: [BiddingController], providers: [redisProvider, AuctionEventsService, AuctionGateway, BiddingService, AuctionCloserService] })
export class BiddingModule {}
