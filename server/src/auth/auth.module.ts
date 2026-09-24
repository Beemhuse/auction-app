import { Global, Module } from '@nestjs/common';
import { TelegramAuthGuard } from './telegram-auth.guard';
import { TelegramAuthService } from './telegram-auth.service';
import { RoomTokenService } from './room-token.service';
import { RoomTokenGuard } from './room-token.guard';

@Global()
@Module({ providers: [TelegramAuthService, TelegramAuthGuard, RoomTokenService, RoomTokenGuard], exports: [TelegramAuthService, TelegramAuthGuard, RoomTokenService, RoomTokenGuard] })
export class AuthModule {}
