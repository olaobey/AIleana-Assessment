import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class InitializeWalletTopupDto {
  @ApiProperty({ example: 5000, description: 'Amount to top up (NGN)' })
  @IsNumber()
  @Min(1)
  amount: number;
}
