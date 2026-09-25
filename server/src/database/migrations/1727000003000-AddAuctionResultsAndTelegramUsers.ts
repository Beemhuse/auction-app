import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuctionResultsAndTelegramUsers1727000003000 implements MigrationInterface {
  name = 'AddAuctionResultsAndTelegramUsers1727000003000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE auction_results (auction_id uuid PRIMARY KEY REFERENCES auctions(id), outcome varchar(20) NOT NULL, winner_telegram_user_id bigint, winning_bid_minor bigint, highest_bid_minor bigint, closed_at timestamptz NOT NULL DEFAULT now())`);
    // Auctions closed before results existed get a row too, so nobody is messaged about them retroactively.
    await queryRunner.query(`INSERT INTO auction_results (auction_id, outcome, closed_at) SELECT id, 'LEGACY', updated_at FROM auctions WHERE status = 'CLOSED'`);
    await queryRunner.query(`CREATE TABLE telegram_users (telegram_user_id bigint PRIMARY KEY, username varchar, first_name varchar, last_name varchar, updated_at timestamptz NOT NULL DEFAULT now())`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE telegram_users`);
    await queryRunner.query(`DROP TABLE auction_results`);
  }
}
