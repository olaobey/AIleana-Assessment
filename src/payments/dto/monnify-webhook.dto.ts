import { ApiPropertyOptional } from '@nestjs/swagger';

class MonnifyEventDataDto {
  @ApiPropertyOptional({ example: 'AIL-1700000000000-acde' })
  paymentReference?: string;

  @ApiPropertyOptional({ example: 'PAID' })
  paymentStatus?: string;

  @ApiPropertyOptional({ example: 5000 })
  amountPaid?: number;

  @ApiPropertyOptional({ example: 'MNFY|...' })
  transactionReference?: string;
}

export class MonnifyWebhookDto {
  @ApiPropertyOptional({ example: 'SUCCESSFUL_TRANSACTION' })
  eventType?: string;

  @ApiPropertyOptional({ type: MonnifyEventDataDto })
  eventData?: MonnifyEventDataDto;

  // Sometimes providers send nested "responseBody" or a different shape.
  @ApiPropertyOptional({ type: Object })
  responseBody?: Record<string, any>;

  @ApiPropertyOptional({ type: Object })
  data?: Record<string, any>;

  @ApiPropertyOptional({ type: Object })
  payload?: Record<string, any>;

  // fallback
  @ApiPropertyOptional({ example: 'AIL-1700000000000-acde' })
  paymentReference?: string;
}
