import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auction, DepositRefund } from '../database/entities';
import { RegistrationsModule } from '../registrations/registrations.module';
import { TelegramBotService } from './telegram-bot.service';

@Module({ imports: [TypeOrmModule.forFeature([Auction, DepositRefund]), RegistrationsModule], providers: [TelegramBotService], exports: [TelegramBotService] })
export class TelegramModule {}
