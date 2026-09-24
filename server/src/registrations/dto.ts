import { IsEmail, IsUUID, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRegistrationDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() auctionId: string;
  @ApiProperty({ format: 'email', description: 'Email passed to Paystack for this deposit' }) @IsEmail() email: string;
}
export class RedeemEntryCodeDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() auctionId: string;
  @ApiProperty({ example: 'HMR-ABCD2345', pattern: '^HMR-[A-Z2-9]{8}$' }) @Matches(/^HMR-[A-Z2-9]{8}$/) code: string;
}

export class RegistrationResponseDto {
  @ApiProperty({ format: 'uuid' }) registrationId: string;
  @ApiProperty({ format: 'uri' }) checkoutUrl: string;
  @ApiProperty({ enum: ['PENDING', 'HELD', 'APPLIED', 'REFUNDED', 'FORFEIT'] }) status: string;
  @ApiProperty({ description: 'Paystack reports this deposit as paid but the webhook has not confirmed it yet; checkoutUrl is empty and the payer must not pay again' }) awaitingConfirmation: boolean;
}

export class RedemptionResponseDto {
  @ApiProperty({ format: 'uuid' }) auctionId: string;
  @ApiProperty({ format: 'uuid' }) registrationId: string;
  @ApiProperty() admitted: boolean;
  @ApiProperty({ format: 'date-time' }) expiresAt: Date;
  @ApiProperty({ description: 'Signed token for the v1 auction WebSocket and bid endpoints; valid until the latest possible soft-close end' }) roomToken: string;
}

export class RoomTokenRequestDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() auctionId: string;
}

export class MyRegistrationDto {
  @ApiProperty({ format: 'uuid' }) registrationId: string;
  @ApiProperty({ format: 'uuid' }) auctionId: string;
  @ApiProperty({ enum: ['PENDING', 'HELD', 'APPLIED', 'REFUNDED', 'FORFEIT'] }) depositStatus: string;
  @ApiProperty({ description: 'Entry code has been redeemed; the caller may request room tokens' }) admitted: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt: Date;
}
