import { Controller, Get, Module, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
class HealthController {
  @Get() @ApiOperation({ operationId: 'getHealth', summary: 'Check API process health' }) @ApiOkResponse({ schema: { example: { status: 'ok', service: 'project-hammer-api' } } })
  check() { return { status: 'ok', service: 'project-hammer-api' }; }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
