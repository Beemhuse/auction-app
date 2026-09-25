import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsString, Length, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PaystackChargeDataDto {
  @ApiProperty() @IsNumber() id: number;
  @ApiProperty() @IsString() @IsNotEmpty() reference: string;
  @ApiProperty({ enum: ['success'] }) @IsIn(['success']) status: 'success';
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) amount: number;
  @ApiProperty({ example: 'NGN', minLength: 3, maxLength: 3 }) @IsString() @Length(3, 3) currency: string;
}

export class PaystackWebhookDto {
  @ApiProperty({ enum: ['charge.success'] }) @IsIn(['charge.success']) event: 'charge.success';
  @ApiProperty({ type: PaystackChargeDataDto }) @ValidateNested() @Type(() => PaystackChargeDataDto) data: PaystackChargeDataDto;
}

export class PaymentWebhookResponseDto {
  @ApiProperty() received: boolean;
  @ApiProperty({ required: false }) duplicate?: boolean;
  @ApiProperty({ required: false }) ignored?: boolean;
}
