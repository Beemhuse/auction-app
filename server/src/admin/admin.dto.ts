import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { AuctionStatus } from '../database/entities';

export class CreateAuctionDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  title: string;

  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
  @IsString() @Length(3, 3) @Matches(/^[A-Z]{3}$/)
  currency: string;

  @IsString() @Matches(/^\d+$/)
  startingPriceMinor: string;

  @IsOptional() @IsString() @Matches(/^\d+$/)
  reservePriceMinor?: string | null;

  @IsString() @Matches(/^[1-9]\d*$/)
  depositAmountMinor: string;

  @IsString() @Matches(/^[1-9]\d*$/)
  minIncrementMinor: string;

  @IsOptional() @IsEnum(AuctionStatus)
  status?: AuctionStatus;

  @IsISO8601()
  startsAt: string;

  @IsISO8601()
  endsAt: string;
}

export class UpdateAuctionDto extends PartialType(CreateAuctionDto) {}

export class SendUserMessageDto {
  @IsString() @Matches(/^\d{1,20}$/)
  telegramUserId: string;

  // Telegram's limit is 4096 characters; the auction title header uses some of it.
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsNotEmpty() @MaxLength(3500)
  text: string;
}

export class RefundDepositDto {
  /** Omit to refund the full deposit. */
  @IsOptional() @IsString() @Matches(/^[1-9]\d{0,17}$/)
  amountMinor?: string;
}

export class RetryRefundDto {
  @IsString() @Matches(/^\d{6,20}$/, { message: 'Account number must be 6 to 20 digits' })
  accountNumber: string;

  @IsString() @Matches(/^\d{1,10}$/)
  bankId: string;
}
