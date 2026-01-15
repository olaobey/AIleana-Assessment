import { ApiProperty } from '@nestjs/swagger';
import { WalletResponseDto } from './wallet-response.dto';
import { TransactionResponseDto } from './transaction-response.dto';

export class DeductWalletResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: WalletResponseDto })
  wallet: WalletResponseDto;

  @ApiProperty({ type: TransactionResponseDto })
  transaction: TransactionResponseDto;
}
