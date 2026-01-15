import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransactionResponseDto {
  @ApiProperty({ example: 'a0b8c0b2-1af2-4b6f-b9d4-2b2f2b0efc11' })
  id: string;

  @ApiProperty({ example: 5000 })
  amount: number;

  @ApiProperty({ example: 'CREDIT', description: 'CREDIT | DEBIT' })
  type: string;

  @ApiProperty({
    example: 'SUCCESS',
    description: 'PENDING | SUCCESS | FAILED',
  })
  status: string;

  @ApiProperty({ example: 'TOPUP:AIL-1700000000000-acde' })
  reference: string;

  @ApiPropertyOptional({
    description: 'Optional narration/description',
    example: 'Wallet top-up via Monnify',
  })
  narration?: string;

  @ApiProperty({ example: '2026-01-14T12:10:00.000Z' })
  createdAt: Date;
}
