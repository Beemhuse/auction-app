import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuctionStatus } from '../database/entities';

export class AuctionResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() title: string;
  @ApiProperty({ example: 'NGN', minLength: 3, maxLength: 3 }) currency: string;
  @ApiProperty({ description: 'Integer amount in the currency minor unit', example: '100000' }) startingPriceMinor: string;
  @ApiPropertyOptional({ description: 'Integer amount in the currency minor unit', example: '150000' }) reservePriceMinor: string | null;
  @ApiProperty({ example: '20000' }) depositAmountMinor: string;
  @ApiProperty({ example: '5000' }) minIncrementMinor: string;
  @ApiProperty({ enum: AuctionStatus }) status: AuctionStatus;
  @ApiProperty({ format: 'date-time' }) startsAt: Date;
  @ApiProperty({ format: 'date-time' }) endsAt: Date;
  @ApiProperty({ format: 'date-time' }) effectiveEndsAt: Date;
  @ApiProperty({ format: 'date-time' }) createdAt: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt: Date;
}
