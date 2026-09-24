import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentAttempts1727000002000 implements MigrationInterface {
  name = 'AddPaymentAttempts1727000002000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE payment_attempt_status AS ENUM ('INITIALIZING','PENDING','PAID','FAILED')`);
    await queryRunner.query(`CREATE TABLE payment_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), registration_id uuid NOT NULL REFERENCES auction_registrations(id), reference varchar NOT NULL UNIQUE, checkout_url varchar, status payment_attempt_status NOT NULL DEFAULT 'INITIALIZING', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query(`CREATE INDEX idx_payment_attempt_registration ON payment_attempts(registration_id, created_at DESC)`);
    await queryRunner.query(`INSERT INTO payment_attempts (registration_id, reference, status) SELECT id, payment_reference, 'PENDING' FROM auction_registrations WHERE payment_reference IS NOT NULL ON CONFLICT (reference) DO NOTHING`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE payment_attempts`);
    await queryRunner.query(`DROP TYPE payment_attempt_status`);
  }
}
