import { Body, Controller, ForbiddenException, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoomRequest, RoomTokenGuard } from '../auth/room-token.guard';
import { BiddingService } from './bidding.service';
import { BidResponseDto, LiveStateResponseDto, PlaceBidDto } from './dto';

@ApiTags('bids') @ApiBearerAuth()
@UseGuards(RoomTokenGuard) @Controller({ path: 'bids', version: '1' })
export class BiddingController {
  constructor(private readonly bidding: BiddingService) {}
  @Post() @ApiOperation({ operationId: 'placeBid', summary: 'Place an idempotent live auction bid with a room token' }) @ApiCreatedResponse({ type: BidResponseDto })
  place(@Req() req: RoomRequest, @Body() dto: PlaceBidDto) {
    if (dto.auctionId !== req.room.auctionId) throw new ForbiddenException('Room token is for a different auction');
    return this.bidding.place(req.room.userId, dto);
  }
  @Get('state') @ApiOperation({ operationId: 'getLiveState', summary: 'Current price, timing, and leader status for the room token holder' }) @ApiOkResponse({ type: LiveStateResponseDto })
  state(@Req() req: RoomRequest) { return this.bidding.state(req.room.userId, req.room.auctionId); }
}
