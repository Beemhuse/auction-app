import { Controller, Get, Module, NotFoundException, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auction, AuctionStatus } from '../database/entities';
import { AuctionResponseDto } from './dto';

@ApiTags('auctions')
@Controller({ path: 'auctions', version: '1' })
class AuctionsController {
  constructor(@InjectRepository(Auction) private readonly auctions: Repository<Auction>) {}
  @Get() @ApiOperation({ operationId: 'listAuctions', summary: 'List available auctions' }) @ApiOkResponse({ type: AuctionResponseDto, isArray: true })
  list() { return this.auctions.find({ where: [{ status: AuctionStatus.SCHEDULED }, { status: AuctionStatus.ACTIVE }], order: { startsAt: 'ASC' } }); }
  @Get(':id') @ApiOperation({ operationId: 'getAuction', summary: 'Get an auction by ID' }) @ApiOkResponse({ type: AuctionResponseDto }) @ApiNotFoundResponse({ description: 'Auction not found' })
  async get(@Param('id') id: string) {
    const auction = await this.auctions.findOneBy({ id });
    if (!auction) throw new NotFoundException('Auction not found');
    return auction;
  }
}

@Module({ imports: [TypeOrmModule.forFeature([Auction])], controllers: [AuctionsController], exports: [TypeOrmModule] })
export class AuctionsModule {}
