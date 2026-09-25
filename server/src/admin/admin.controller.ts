import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminKeyGuard } from './admin-key.guard';
import { CreateAuctionDto, RefundDepositDto, RetryRefundDto, SendUserMessageDto, UpdateAuctionDto } from './admin.dto';
import { RefundsService } from '../payments/refunds.service';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiHeader({ name: 'x-admin-key', required: true })
@UseGuards(AdminKeyGuard)
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private readonly admin: AdminService, private readonly refunds: RefundsService) {}

  @Get('overview') @ApiOperation({ summary: 'Get auction operations overview' })
  overview() { return this.admin.overview(); }

  @Post('auctions') @ApiOperation({ summary: 'Create an auction' })
  create(@Body() input: CreateAuctionDto) { return this.admin.create(input); }

  @Patch('auctions/:id') @ApiOperation({ summary: 'Update an auction' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() input: UpdateAuctionDto) { return this.admin.update(id, input); }

  @Get('auctions/:id/registrations') @ApiOperation({ summary: 'List auction registrations' })
  registrations(@Param('id', ParseUUIDPipe) id: string) { return this.admin.registrationsFor(id); }

  @Post('auctions/:id/messages') @ApiOperation({ summary: 'Send a Telegram message through the bot to a user registered for this auction' })
  message(@Param('id', ParseUUIDPipe) id: string, @Body() input: SendUserMessageDto) { return this.admin.messageUser(id, input); }

  @Post('registrations/:id/verify-payment') @ApiOperation({ summary: 'Verify a registration payment with Paystack and confirm it if the webhook was missed' })
  verifyPayment(@Param('id', ParseUUIDPipe) id: string) { return this.admin.verifyPayment(id); }

  @Post('registrations/:id/refund') @ApiOperation({ summary: 'Refund a held deposit through Paystack' })
  refund(@Param('id', ParseUUIDPipe) id: string, @Body() input: RefundDepositDto) { return this.refunds.refundRegistration(id, input.amountMinor); }

  @Post('auctions/:id/refund-losers') @ApiOperation({ summary: 'Refund every held deposit on a closed auction except the winner' })
  refundLosers(@Param('id', ParseUUIDPipe) id: string) { return this.refunds.refundLosers(id); }

  @Post('refunds/:id/retry') @ApiOperation({ summary: 'Complete a needs-attention refund to a bank account the bidder provided' })
  retryRefund(@Param('id', ParseUUIDPipe) id: string, @Body() input: RetryRefundDto) { return this.refunds.retryWithBankAccount(id, input); }

  @Get('banks') @ApiOperation({ summary: 'Banks Paystack can send refunds to' })
  banks(@Query('currency') currency = 'NGN') { return this.refunds.banks(/^[A-Z]{3}$/.test(currency) ? currency : 'NGN'); }

  @Get('auctions/:id/bids') @ApiOperation({ summary: 'List auction bids' })
  bids(@Param('id', ParseUUIDPipe) id: string) { return this.admin.bidsFor(id); }
}
