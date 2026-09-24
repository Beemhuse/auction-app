import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validateEnvironment } from './config/environment';
import { databaseSsl } from './database/ssl';
import { HealthModule } from './health/health.module';
import { AuctionsModule } from './auctions/auctions.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { PaymentsModule } from './payments/payments.module';
import { BiddingModule } from './bidding/bidding.module';
import { AuthModule } from './auth/auth.module';
import { PaystackModule } from './integrations/paystack/paystack.module';
import { TelegramModule } from './telegram/telegram.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres', url: config.getOrThrow<string>('DATABASE_URL'), autoLoadEntities: true,
        synchronize: false, ssl: databaseSsl(config.get<string>('DATABASE_SSL')),
      }),
    }),
    AuthModule, PaystackModule, HealthModule, AuctionsModule, RegistrationsModule, TelegramModule, PaymentsModule, BiddingModule, AdminModule,
  ],
})
export class AppModule {}
