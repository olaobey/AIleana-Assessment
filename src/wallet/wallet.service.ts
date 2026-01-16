import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) throw new NotFoundException('Wallet not found');

    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: wallet.balance.toNumber(),
    };
  }

  async getTransactionHistory(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const transactions = await this.prisma.walletTx.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return transactions.map((t) => ({
      id: t.id,
      amount: t.amount.toNumber(),
      type: t.type,
      status: t.status,
      reference: t.reference,
      narration: t.narration,
      createdAt: t.createdAt,
    }));
  }

  async deductFromWallet(userId: string, amount: number, reference: string) {
    if (!reference?.trim())
      throw new BadRequestException('reference is required');

    if (!Number.isFinite(amount) || amount <= 0)
      throw new BadRequestException('Amount must be > 0');

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      if (wallet.balance.toNumber() < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      const existing = await tx.walletTx.findUnique({
        where: { reference },
      });

      if (existing) {
        const refreshedWallet = await tx.wallet.findUnique({
          where: { id: wallet.id },
        });

        return {
          wallet: {
            id: refreshedWallet!.id,
            userId: refreshedWallet!.userId,
            balance: refreshedWallet!.balance.toNumber(),
          },
          transaction: {
            id: existing.id,
            amount: existing.amount.toNumber(),
            type: existing.type,
            status: existing.status,
            reference: existing.reference,
            narration: existing.narration,
            createdAt: existing.createdAt,
          },
        };
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: new Decimal(amount) },
        },
      });

      const createdTx = await tx.walletTx.create({
        data: {
          walletId: wallet.id,
          amount: new Decimal(amount),
          type: TransactionType.DEBIT,
          status: TransactionStatus.SUCCESS,
          reference,
          narration: 'Wallet debit (call charge)',
        },
      });

      return {
        wallet: {
          id: updatedWallet.id,
          userId: updatedWallet.userId,
          balance: updatedWallet.balance.toNumber(),
        },
        transaction: {
          id: createdTx.id,
          amount: createdTx.amount.toNumber(),
          type: createdTx.type,
          status: createdTx.status,
          reference: createdTx.reference,
          narration: createdTx.narration,
          createdAt: createdTx.createdAt,
        },
      };
    });
  }
}
