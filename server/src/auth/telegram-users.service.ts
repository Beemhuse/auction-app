import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TelegramUser } from '../database/entities';

export type TelegramProfile = { id: string | number; username?: string | null; firstName?: string | null; lastName?: string | null };

/** How long an unchanged profile is trusted before it is written again. */
const REFRESH_MS = 10 * 60_000;

@Injectable()
export class TelegramUsersService {
  private readonly logger = new Logger(TelegramUsersService.name);
  private readonly seen = new Map<string, { key: string; at: number }>();
  constructor(@InjectRepository(TelegramUser) private readonly users: Repository<TelegramUser>) {}

  /** Records the latest profile. Never throws: a failed write must not block the request that carried it. */
  async remember(profile: TelegramProfile): Promise<void> {
    const id = String(profile.id);
    const row = { telegramUserId: id, username: profile.username || null, firstName: profile.firstName || null, lastName: profile.lastName || null };
    const key = `${row.username}|${row.firstName}|${row.lastName}`;
    const cached = this.seen.get(id);
    if (cached?.key === key && Date.now() - cached.at < REFRESH_MS) return;
    try {
      await this.users.upsert(row, ['telegramUserId']);
      this.seen.set(id, { key, at: Date.now() });
    } catch (error) {
      this.logger.warn(`Could not record Telegram profile ${id}: ${error instanceof Error ? error.message : error}`);
    }
  }

  async findMany(ids: string[]): Promise<Map<string, TelegramUser>> {
    const unique = [...new Set(ids)];
    if (!unique.length) return new Map();
    const rows = await this.users.findBy({ telegramUserId: In(unique) });
    return new Map(rows.map((row) => [row.telegramUserId, row]));
  }
}

/** Username and display name for admin views; both null when the user was never seen. */
export function describeTelegramUser(user: TelegramUser | undefined) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  return { telegramUsername: user?.username ?? null, telegramName: name || null };
}
