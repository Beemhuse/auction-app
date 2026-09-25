import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDepositRefunds1727000004000 implements MigrationInterface {
  name = 'AddDepositRefunds1727000004000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE deposit_refunds (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), registration_id uuid NOT NULL UNIQUE REFERENCES auction_registrations(id), provider_refund_id varchar, payment_reference varchar NOT NULL, amount_minor bigint NOT NULL, currency varchar(3) NOT NULL, status varchar(30) NOT NULL, customer_details text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query(`CREATE INDEX idx_deposit_refund_provider ON deposit_refunds(provider_refund_id)`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE deposit_refunds`);
  }
}
