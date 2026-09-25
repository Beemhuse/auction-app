import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auction, AuctionRegistration, AuctionResult, DepositRefund, PaymentAttempt, PaymentEvent } from '../database/entities';
import { RegistrationsModule } from '../registrations/registrations.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { RefundsService } from './refunds.service';
import { TelegramModule } from '../telegram/telegram.module';

// autoLoadEntities only registers entities declared via forFeature, and PaymentEvent is used solely through the transaction manager.
@Module({ imports: [TypeOrmModule.forFeature([PaymentEvent, DepositRefund, AuctionRegistration, Auction, AuctionResult, PaymentAttempt]), RegistrationsModule, TelegramModule], controllers: [PaymentsController], providers: [PaymentsService, RefundsService], exports: [PaymentsService, RefundsService] })
export class PaymentsModule {}
