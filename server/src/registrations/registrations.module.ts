import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auction, AuctionRegistration, PaymentAttempt } from '../database/entities';
import { EntryCodeService } from './entry-code.service';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { TelegramLinkService } from '../telegram/telegram-link.service';

@Module({ imports: [TypeOrmModule.forFeature([Auction, AuctionRegistration, PaymentAttempt])], controllers: [RegistrationsController], providers: [RegistrationsService, EntryCodeService, TelegramLinkService], exports: [EntryCodeService, RegistrationsService] })
export class RegistrationsModule {}
