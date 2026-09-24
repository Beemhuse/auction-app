import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRegistrationEmail1727000001000 implements MigrationInterface {
  name = 'AddRegistrationEmail1727000001000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE auction_registrations ADD COLUMN payer_email varchar`);
    await queryRunner.query(`UPDATE auction_registrations SET payer_email = CONCAT('telegram-', telegram_user_id, '@invalid.local') WHERE payer_email IS NULL`);
    await queryRunner.query(`ALTER TABLE auction_registrations ALTER COLUMN payer_email SET NOT NULL`);
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query(`ALTER TABLE auction_registrations DROP COLUMN payer_email`); }
}
