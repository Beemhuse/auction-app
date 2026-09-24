import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TelegramAuthGuard, TelegramRequest } from '../auth/telegram-auth.guard';
import { CreateRegistrationDto, MyRegistrationDto, RedeemEntryCodeDto, RedemptionResponseDto, RegistrationResponseDto, RoomTokenRequestDto } from './dto';
import { RegistrationsService } from './registrations.service';

@ApiTags('registrations') @ApiHeader({ name: 'x-telegram-init-data', required: true })
@UseGuards(TelegramAuthGuard) @Controller({ path: 'registrations', version: '1' })
export class RegistrationsController {
  constructor(private readonly service: RegistrationsService) {}
  @Post() @ApiOperation({ operationId: 'createRegistration', summary: 'Create or resume an auction registration' }) @ApiCreatedResponse({ type: RegistrationResponseDto })
  create(@Req() req: TelegramRequest, @Body() dto: CreateRegistrationDto) { return this.service.create(dto.auctionId, req.telegramUser.id, dto.email); }
  @Get('mine') @ApiOperation({ operationId: 'listMyRegistrations', summary: 'List the caller\'s registrations and admission state' }) @ApiOkResponse({ type: MyRegistrationDto, isArray: true })
  mine(@Req() req: TelegramRequest) { return this.service.mine(req.telegramUser.id); }
  @Post('redeem') @ApiOperation({ operationId: 'redeemEntryCode', summary: 'Redeem a paid registration entry code' }) @ApiCreatedResponse({ type: RedemptionResponseDto })
  redeem(@Req() req: TelegramRequest, @Body() dto: RedeemEntryCodeDto) { return this.service.redeem(dto.auctionId, req.telegramUser.id, dto.code); }
  @Post('room-token') @ApiOperation({ operationId: 'issueRoomToken', summary: 'Re-issue a room token for an already admitted bidder' }) @ApiCreatedResponse({ type: RedemptionResponseDto })
  roomToken(@Req() req: TelegramRequest, @Body() dto: RoomTokenRequestDto) { return this.service.roomToken(dto.auctionId, req.telegramUser.id); }
}
