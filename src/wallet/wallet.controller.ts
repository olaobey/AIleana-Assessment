import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from '../payments/payments.service';

import { GetWalletResponseDto } from './dto/get-wallet.response.dto';
import { GetTransactionsResponseDto } from './dto/get-transactions.response.dto';
import { DeductWalletDto } from './dto/deduct-wallet.dto';
import { DeductWalletResponseDto } from './dto/deduct-wallet.response.dto';

import { InitializeWalletTopupDto } from '../payments/dto/initialize-wallet-topup.dto';
import { InitializeWalletTopupResponseDto } from '../payments/dto/initialize-wallet-topup.response.dto';

type JwtUser = { userId: string; email: string };
type JwtRequest = Request & { user: JwtUser };

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my wallet' })
  @ApiOkResponse({ type: GetWalletResponseDto })
  async getMe(@Req() req: JwtRequest): Promise<GetWalletResponseDto> {
    const wallet = await this.walletService.getWallet(req.user.userId);
    return { success: true, ...wallet };
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get my transaction history (last 50)' })
  @ApiOkResponse({ type: GetTransactionsResponseDto })
  async getTransactions(
    @Req() req: JwtRequest,
  ): Promise<GetTransactionsResponseDto> {
    const txs = await this.walletService.getTransactionHistory(req.user.userId);
    const mappedTxs = txs.map((tx) => ({
      ...tx,
      narration: tx.narration === null ? undefined : tx.narration,
    }));
    return { success: true, data: mappedTxs };
  }

  @Post('deduct')
  @ApiOperation({
    summary: 'Debit my wallet (used internally e.g. call charge)',
  })
  @ApiOkResponse({ type: DeductWalletResponseDto })
  async deduct(
    @Req() req: JwtRequest,
    @Body() dto: DeductWalletDto,
  ): Promise<DeductWalletResponseDto> {
    const result = await this.walletService.deductFromWallet(
      req.user.userId,
      dto.amount,
      dto.reference,
    );
    // Ensure narration is never null
    const transaction = {
      ...result.transaction,
      narration:
        result.transaction.narration === null
          ? undefined
          : result.transaction.narration,
    };
    return { success: true, wallet: result.wallet, transaction };
  }

  @Post('topup/initialize')
  @ApiOperation({ summary: 'Initialize a wallet top-up (Monnify)' })
  @ApiOkResponse({ type: InitializeWalletTopupResponseDto })
  async initializeTopup(
    @Req() req: JwtRequest,
    @Body() dto: InitializeWalletTopupDto,
  ): Promise<InitializeWalletTopupResponseDto> {
    return this.paymentsService.initializeWalletTopup(
      req.user.userId,
      dto.amount,
    );
  }
}
