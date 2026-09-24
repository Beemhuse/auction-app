import { IsInt, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class PlaceBidDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() auctionId: string;
  @ApiProperty({ format: 'uuid', description: 'Client-generated idempotency key' }) @IsUUID() requestId: string;
  @ApiProperty({ minimum: 1, description: 'Integer amount in the currency minor unit' }) @IsInt() @Min(1) amountMinor: number;
}
export class BidResponseDto {
  @ApiProperty({ enum: ['ACCEPTED', 'DUPLICATE', 'CLOSED', 'UNDERBID'] }) status: string;
  @ApiProperty({ required: false }) amountMinor?: number;
  @ApiProperty({ required: false }) sequence?: number;
  @ApiProperty({ required: false, format: 'date-time' }) effectiveEndsAt?: string;
  @ApiProperty({ required: false }) detail?: string;
}
export class LiveStateResponseDto {
  @ApiProperty({ format: 'uuid' }) auctionId: string;
  @ApiProperty({ enum: ['SCHEDULED', 'ACTIVE', 'CLOSED'] }) status: string;
  @ApiProperty({ example: 'NGN' }) currency: string;
  @ApiProperty({ nullable: true, type: String, description: 'Current leading amount in minor units; null before the first bid' }) highestBidMinor: string | null;
  @ApiProperty() bidCount: number;
  @ApiProperty({ description: 'Smallest amount the next bid may offer, in minor units' }) minimumNextBidMinor: string;
  @ApiProperty() minIncrementMinor: string;
  @ApiProperty({ format: 'date-time' }) startsAt: string;
  @ApiProperty({ format: 'date-time', description: 'End time including soft-close extensions' }) effectiveEndsAt: string;
  @ApiProperty({ description: 'Whether the token holder currently has the highest bid' }) leading: boolean;
  @ApiProperty({ format: 'date-time', description: 'Server clock, for countdown skew correction' }) serverTime: string;
}
