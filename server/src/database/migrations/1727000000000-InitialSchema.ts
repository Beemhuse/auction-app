import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1727000000000 implements MigrationInterface {
  name = 'InitialSchema1727000000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE auction_status AS ENUM ('SCHEDULED','ACTIVE','CLOSED')`);
    await queryRunner.query(`CREATE TYPE deposit_status AS ENUM ('PENDING','HELD','APPLIED','REFUNDED','FORFEIT')`);
    await queryRunner.query(`CREATE TABLE auctions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title varchar(200) NOT NULL, currency char(3) NOT NULL, starting_price_minor bigint NOT NULL CHECK (starting_price_minor >= 0), reserve_price_minor bigint CHECK (reserve_price_minor >= 0), deposit_amount_minor bigint NOT NULL CHECK (deposit_amount_minor > 0), min_increment_minor bigint NOT NULL CHECK (min_increment_minor > 0), status auction_status NOT NULL DEFAULT 'SCHEDULED', starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, effective_ends_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (starts_at < ends_at))`);
    await queryRunner.query(`CREATE TABLE auction_registrations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), auction_id uuid NOT NULL REFERENCES auctions(id), telegram_user_id bigint NOT NULL, payment_reference varchar UNIQUE, entry_code_digest varchar UNIQUE, deposit_status deposit_status NOT NULL DEFAULT 'PENDING', code_redeemed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT uq_registration_auction_user UNIQUE (auction_id, telegram_user_id))`);
    await queryRunner.query(`CREATE TABLE payment_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider_event_id varchar NOT NULL UNIQUE, payment_reference varchar NOT NULL, amount_minor bigint NOT NULL, currency char(3) NOT NULL, processed_at timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query(`CREATE TABLE bids (id bigserial PRIMARY KEY, auction_id uuid NOT NULL REFERENCES auctions(id), telegram_user_id bigint NOT NULL, amount_minor bigint NOT NULL CHECK (amount_minor > 0), sequence bigint NOT NULL, request_id uuid NOT NULL UNIQUE, placed_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT uq_bid_auction_sequence UNIQUE (auction_id, sequence))`);
    await queryRunner.query(`CREATE INDEX idx_auction_status_time ON auctions(status, starts_at, effective_ends_at)`);
    await queryRunner.query(`CREATE INDEX idx_registration_auction ON auction_registrations(auction_id)`);
    await queryRunner.query(`CREATE INDEX idx_bid_auction_sequence ON bids(auction_id, sequence)`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE bids'); await queryRunner.query('DROP TABLE payment_events');
    await queryRunner.query('DROP TABLE auction_registrations'); await queryRunner.query('DROP TABLE auctions');
    await queryRunner.query('DROP TYPE deposit_status'); await queryRunner.query('DROP TYPE auction_status');
  }
}
