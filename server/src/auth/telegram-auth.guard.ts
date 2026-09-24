import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { TelegramAuthService, TelegramIdentity } from './telegram-auth.service';

export type TelegramRequest = FastifyRequest & { telegramUser: TelegramIdentity };

@Injectable()
export class TelegramAuthGuard implements CanActivate {
  constructor(private readonly telegramAuth: TelegramAuthService) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TelegramRequest>();
    const value = request.headers['x-telegram-init-data'];
    if (typeof value !== 'string') throw new UnauthorizedException('Telegram authentication required');
    request.telegramUser = this.telegramAuth.validate(value);
    return true;
  }
}
