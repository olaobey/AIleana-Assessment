import { ApiProperty } from '@nestjs/swagger';

export class WalletResponseDto {
  @ApiProperty({ example: 'c7b55f6d-9c1d-4e66-9f4c-1c5bb0c0c9b2' })
  id: string;

  @ApiProperty({ example: 'b9f36e1b-8a68-4dd6-b34b-2fdbd9f0a5d2' })
  userId: string;

  @ApiProperty({
    example: 12500.5,
    description:
      'Wallet balance in NGN (Decimal stored in DB, returned as number)',
  })
  balance: number;
}
