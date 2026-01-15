import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        service: 'AIleana Payments & Calls API',
      },
    },
  })
  health() {
    return { status: 'ok', service: 'AIleana Payments & Calls API' };
  }
}
