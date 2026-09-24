import { createHmac, timingSafeEqual } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Auction, AuctionRegistration, DepositStatus, PaymentAttempt, PaymentAttemptStatus, PaymentEvent } from '../database/entities';
import { EntryCodeService } from '../registrations/entry-code.service';
import { PaystackWebhookDto } from './dto';
import { TelegramBotService } from '../telegram/telegram-bot.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly config: ConfigService, private readonly dataSource: DataSource, private readonly codes: EntryCodeService, private readonly telegram: TelegramBotService) {}
  async processWebhook(rawBody: Buffer, signature: string, input: unknown) {
    const expected = createHmac('sha512', this.config.getOrThrow<string>('PAYSTACK_SECRET_KEY')).update(rawBody).digest();
    let actual: Buffer;
    try { actual = Buffer.from(signature, 'hex'); } catch { throw new UnauthorizedException('Invalid webhook signature'); }
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new UnauthorizedException('Invalid webhook signature');
    const event = this.parsePaystackEvent(input);

    const processed = await this.dataSource.transaction(async (manager) => {
      const providerEventId = `paystack:charge.success:${event.data.id}`;
      if (await manager.existsBy(PaymentEvent, { providerEventId })) {
        const attempt = await manager.findOneBy(PaymentAttempt, { reference: event.data.reference });
        const registration = attempt ? await manager.findOneBy(AuctionRegistration, { id: attempt.registrationId }) : null;
        if (!registration || registration.depositStatus !== DepositStatus.HELD) return { duplicate: true as const, delivery: null };
        const auction = await manager.findOneByOrFail(Auction, { id: registration.auctionId });
        return { duplicate: true as const, delivery: { registration, auction, code: this.codes.generate(registration.id) } };
      }
      const attempt = await manager.findOne(PaymentAttempt, { where: { reference: event.data.reference }, lock: { mode: 'pessimistic_write' } });
      if (!attempt) throw new NotFoundException('Payment reference not found');
      const registration = await manager.findOne(AuctionRegistration, { where: { id: attempt.registrationId }, lock: { mode: 'pessimistic_write' } });
      if (!registration) throw new NotFoundException('Payment reference not found');
      const auction = await manager.findOneByOrFail(Auction, { id: registration.auctionId });
      if (String(event.data.amount) !== auction.depositAmountMinor || event.data.currency.toUpperCase() !== auction.currency) throw new BadRequestException('Payment amount or currency mismatch');
      registration.depositStatus = DepositStatus.HELD;
      const code = this.codes.generate(registration.id);
      registration.entryCodeDigest = this.codes.digest(code);
      await manager.save(registration);
      attempt.status = PaymentAttemptStatus.PAID;
      await manager.save(attempt);
      await manager.save(PaymentEvent, manager.create(PaymentEvent, { providerEventId, paymentReference: event.data.reference, amountMinor: String(event.data.amount), currency: event.data.currency.toUpperCase() }));
      return { duplicate: false as const, delivery: { registration, auction, code } };
    });
    if (processed.delivery) await this.telegram.sendEntryCode(processed.delivery.registration.telegramUserId, processed.delivery.auction, processed.delivery.code);
    return processed.duplicate ? { received: true, duplicate: true } : { received: true };
  }

  private parsePaystackEvent(input: unknown): PaystackWebhookDto {
    if (!input || typeof input !== 'object') throw new BadRequestException('Invalid Paystack event');
    const candidate = input as { event?: unknown; data?: Record<string, unknown> };
    const data = candidate.data;
    if (candidate.event !== 'charge.success' || !data || data.status !== 'success' || typeof data.reference !== 'string' || typeof data.currency !== 'string' || typeof data.amount !== 'number' || !Number.isSafeInteger(data.amount) || data.amount < 1 || (typeof data.id !== 'number' && typeof data.id !== 'string')) {
      throw new BadRequestException('Invalid Paystack charge event');
    }
    return { event: 'charge.success', data: { id: Number(data.id), reference: data.reference, status: 'success', amount: data.amount, currency: data.currency } };
  }
}
