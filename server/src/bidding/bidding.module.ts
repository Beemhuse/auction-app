import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auction, AuctionRegistration, Bid } from '../database/entities';
import { BiddingController } from './bidding.controller';
import { BiddingService } from './bidding.service';
import { redisProvider } from './redis.provider';
import { AuctionEventsService } from './auction-events.service';
import { AuctionGateway } from './auction.gateway';

@Module({ imports: [TypeOrmModule.forFeature([Auction, AuctionRegistration, Bid])], controllers: [BiddingController], providers: [redisProvider, AuctionEventsService, AuctionGateway, BiddingService] })
export class BiddingModule {}
