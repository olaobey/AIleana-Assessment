import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min } from 'class-validator';

export class DeductWalletDto {
  @ApiProperty({ example: 200, description: 'Amount to debit from wallet' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    example: 'CALL:session_12345',
    description: 'Unique reference for idempotency & tracing',
  })
  @IsString()
  reference: string;
}
