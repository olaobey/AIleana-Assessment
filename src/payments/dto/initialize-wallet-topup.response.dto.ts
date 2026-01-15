import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InitializeWalletTopupResponseDto {
  @ApiProperty({ example: 'AIL-1700000000000-acde' })
  paymentReference: string;

  @ApiProperty({ example: 'https://sandbox.monnify.com/checkout/...' })
  checkoutUrl: string;

  @ApiPropertyOptional({ example: 'MNFY|20240101010101|...' })
  monnifyTransactionReference?: string;
}
