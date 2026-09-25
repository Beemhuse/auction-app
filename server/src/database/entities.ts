import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

export enum AuctionStatus { SCHEDULED = 'SCHEDULED', ACTIVE = 'ACTIVE', CLOSED = 'CLOSED' }
export enum DepositStatus { PENDING = 'PENDING', HELD = 'HELD', APPLIED = 'APPLIED', REFUNDED = 'REFUNDED', FORFEIT = 'FORFEIT' }
export enum PaymentAttemptStatus { INITIALIZING = 'INITIALIZING', PENDING = 'PENDING', PAID = 'PAID', FAILED = 'FAILED' }
/** LEGACY marks auctions closed before results were recorded; nobody was notified about them. */
export enum AuctionOutcome { SOLD = 'SOLD', RESERVE_NOT_MET = 'RESERVE_NOT_MET', NO_BIDS = 'NO_BIDS', LEGACY = 'LEGACY' }

@Entity('auctions')
export class Auction {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 200 }) title: string;
  @Column({ name: 'currency', length: 3 }) currency: string;
  @Column({ name: 'starting_price_minor', type: 'bigint' }) startingPriceMinor: string;
  @Column({ name: 'reserve_price_minor', type: 'bigint', nullable: true }) reservePriceMinor: string | null;
  @Column({ name: 'deposit_amount_minor', type: 'bigint' }) depositAmountMinor: string;
  @Column({ name: 'min_increment_minor', type: 'bigint' }) minIncrementMinor: string;
  @Column({ type: 'enum', enum: AuctionStatus, default: AuctionStatus.SCHEDULED }) status: AuctionStatus;
  @Column({ name: 'starts_at', type: 'timestamptz' }) startsAt: Date;
  @Column({ name: 'ends_at', type: 'timestamptz' }) endsAt: Date;
  @Column({ name: 'effective_ends_at', type: 'timestamptz' }) effectiveEndsAt: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

@Entity('auction_registrations')
@Unique('uq_registration_auction_user', ['auctionId', 'telegramUserId'])
export class AuctionRegistration {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ name: 'auction_id', type: 'uuid' }) auctionId: string;
  @Column({ name: 'telegram_user_id', type: 'bigint' }) telegramUserId: string;
  @Column({ name: 'payer_email', type: 'varchar' }) payerEmail: string;
  @Index({ unique: true }) @Column({ name: 'payment_reference', type: 'varchar', nullable: true }) paymentReference: string | null;
  @Column({ name: 'entry_code_digest', type: 'varchar', nullable: true, unique: true }) entryCodeDigest: string | null;
  @Column({ name: 'deposit_status', type: 'enum', enum: DepositStatus, default: DepositStatus.PENDING }) depositStatus: DepositStatus;
  @Column({ name: 'code_redeemed_at', type: 'timestamptz', nullable: true }) codeRedeemedAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

@Entity('payment_events')
export class PaymentEvent {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ name: 'provider_event_id' }) providerEventId: string;
  @Column({ name: 'payment_reference' }) paymentReference: string;
  @Column({ name: 'amount_minor', type: 'bigint' }) amountMinor: string;
  @Column({ length: 3 }) currency: string;
  @CreateDateColumn({ name: 'processed_at' }) processedAt: Date;
}

@Entity('payment_attempts')
export class PaymentAttempt {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ name: 'registration_id', type: 'uuid' }) registrationId: string;
  @Index({ unique: true }) @Column({ type: 'varchar' }) reference: string;
  @Column({ name: 'checkout_url', type: 'varchar', nullable: true }) checkoutUrl: string | null;
  @Column({ type: 'enum', enum: PaymentAttemptStatus, default: PaymentAttemptStatus.INITIALIZING }) status: PaymentAttemptStatus;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

@Entity('bids')
@Unique('uq_bid_auction_sequence', ['auctionId', 'sequence'])
export class Bid {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' }) id: string;
  @Index() @Column({ name: 'auction_id', type: 'uuid' }) auctionId: string;
  @Column({ name: 'telegram_user_id', type: 'bigint' }) telegramUserId: string;
  @Column({ name: 'amount_minor', type: 'bigint' }) amountMinor: string;
  @Column({ type: 'bigint' }) sequence: string;
  @Index({ unique: true }) @Column({ name: 'request_id', type: 'uuid' }) requestId: string;
  @CreateDateColumn({ name: 'placed_at' }) placedAt: Date;
}

/** How a closed auction ended. Kept apart from `auctions`, whose rows are served publicly. */
@Entity('auction_results')
export class AuctionResult {
  @PrimaryColumn({ name: 'auction_id', type: 'uuid' }) auctionId: string;
  @Column({ type: 'varchar', length: 20 }) outcome: AuctionOutcome;
  @Column({ name: 'winner_telegram_user_id', type: 'bigint', nullable: true }) winnerTelegramUserId: string | null;
  @Column({ name: 'winning_bid_minor', type: 'bigint', nullable: true }) winningBidMinor: string | null;
  @Column({ name: 'highest_bid_minor', type: 'bigint', nullable: true }) highestBidMinor: string | null;
  @CreateDateColumn({ name: 'closed_at' }) closedAt: Date;
}

/** Latest Telegram profile seen for a user, so admins can recognise and reach them. */
@Entity('telegram_users')
export class TelegramUser {
  @PrimaryColumn({ name: 'telegram_user_id', type: 'bigint' }) telegramUserId: string;
  @Column({ type: 'varchar', nullable: true }) username: string | null;
  @Column({ name: 'first_name', type: 'varchar', nullable: true }) firstName: string | null;
  @Column({ name: 'last_name', type: 'varchar', nullable: true }) lastName: string | null;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

/** A deposit refund requested through Paystack. One per registration; a failed one can be retried. */
@Entity('deposit_refunds')
export class DepositRefund {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ name: 'registration_id', type: 'uuid' }) registrationId: string;
  @Column({ name: 'provider_refund_id', type: 'varchar', nullable: true }) providerRefundId: string | null;
  @Column({ name: 'payment_reference', type: 'varchar' }) paymentReference: string;
  @Column({ name: 'amount_minor', type: 'bigint' }) amountMinor: string;
  @Column({ length: 3 }) currency: string;
  /** Paystack's status (pending, processing, processed, failed, needs-attention), or `requesting` before Paystack answers. */
  @Column({ type: 'varchar', length: 30 }) status: string;
  /** Bank details the bidder sent in the bot chat when Paystack could not refund automatically. */
  @Column({ name: 'customer_details', type: 'text', nullable: true }) customerDetails: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
