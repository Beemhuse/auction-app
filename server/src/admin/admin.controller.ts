import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminKeyGuard } from './admin-key.guard';
import { CreateAuctionDto, UpdateAuctionDto } from './admin.dto';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiHeader({ name: 'x-admin-key', required: true })
@UseGuards(AdminKeyGuard)
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview') @ApiOperation({ summary: 'Get auction operations overview' })
  overview() { return this.admin.overview(); }

  @Post('auctions') @ApiOperation({ summary: 'Create an auction' })
  create(@Body() input: CreateAuctionDto) { return this.admin.create(input); }

  @Patch('auctions/:id') @ApiOperation({ summary: 'Update an auction' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() input: UpdateAuctionDto) { return this.admin.update(id, input); }

  @Get('auctions/:id/registrations') @ApiOperation({ summary: 'List auction registrations' })
  registrations(@Param('id', ParseUUIDPipe) id: string) { return this.admin.registrationsFor(id); }

  @Get('auctions/:id/bids') @ApiOperation({ summary: 'List auction bids' })
  bids(@Param('id', ParseUUIDPipe) id: string) { return this.admin.bidsFor(id); }
}
