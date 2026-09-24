import { Body, Controller, Headers, Post, RawBodyRequest, Req, UnauthorizedException } from '@nestjs/common';
import { ApiBody, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { PaymentsService } from './payments.service';
import { PaystackWebhookDto, PaymentWebhookResponseDto } from './dto';

@ApiTags('payments') @Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}
  @Post('webhooks/paystack') @ApiHeader({ name: 'x-paystack-signature', required: true }) @ApiBody({ type: PaystackWebhookDto }) @ApiOperation({ operationId: 'receivePaystackWebhook', summary: 'Receive a verified Paystack charge event' }) @ApiOkResponse({ type: PaymentWebhookResponseDto })
  webhook(@Req() req: RawBodyRequest<FastifyRequest>, @Headers('x-paystack-signature') signature: string | undefined, @Body() body: Record<string, unknown>) {
    if (!signature || !req.rawBody) throw new UnauthorizedException('Missing webhook signature');
    return this.payments.processWebhook(req.rawBody, signature, body);
  }
}
