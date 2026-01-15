import { ApiProperty } from '@nestjs/swagger';
import { WalletResponseDto } from './wallet-response.dto';

export class GetWalletResponseDto extends WalletResponseDto {
  @ApiProperty({ example: true })
  success: boolean;
}
