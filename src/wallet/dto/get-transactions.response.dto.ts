import { ApiProperty } from '@nestjs/swagger';
import { TransactionResponseDto } from './transaction-response.dto';

export class GetTransactionsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [TransactionResponseDto] })
  data: TransactionResponseDto[];
}
