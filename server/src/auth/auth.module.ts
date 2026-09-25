import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramUser } from '../database/entities';
import { TelegramAuthGuard } from './telegram-auth.guard';
import { TelegramAuthService } from './telegram-auth.service';
import { RoomTokenService } from './room-token.service';
import { RoomTokenGuard } from './room-token.guard';
import { TelegramUsersService } from './telegram-users.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([TelegramUser])],
  providers: [TelegramAuthService, TelegramAuthGuard, RoomTokenService, RoomTokenGuard, TelegramUsersService],
  exports: [TelegramAuthService, TelegramAuthGuard, RoomTokenService, RoomTokenGuard, TelegramUsersService],
})
export class AuthModule {}
