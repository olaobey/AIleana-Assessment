import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentResponseDto {
  @ApiProperty({ example: 'PAID', description: 'PAID | PENDING | FAILED' })
  status: string;

  @ApiProperty({ example: 'AIL-1700000000000-acde' })
  paymentReference: string;
}
