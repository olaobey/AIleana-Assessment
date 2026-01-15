import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns a simplified wallet response (Decimal -> number)
   */
  async getWallet(userId: string): Promise<{
    id: string;
    userId: string;
    balance: number;
  }> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) throw new NotFoundException('Wallet not found');

    return {
      id: wallet.id,
      userId: wallet.userId,
      balance:
        wallet.balance instanceof Prisma.Decimal
          ? wallet.balance.toNumber()
          : Number(wallet.balance),
    };
  }

  /**
   * Returns last 50 transactions (mapped to DTO-friendly primitives)
   * Assumes your model is WalletTx (recommended).
   */
  async getTransactionHistory(userId: string): Promise<
    Array<{
      id: string;
      amount: number;
      type: string;
      status: string;
      reference: string;
      narration?: string | null;
      createdAt: Date;
    }>
  > {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const transactions = await this.prisma.walletTx.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return transactions.map((t) => ({
      id: t.id,
      amount:
        t.amount instanceof Prisma.Decimal
          ? t.amount.toNumber()
          : Number(t.amount),
      type: t.type,
      status: t.status,
      reference: t.reference,
      narration: t.narration,
      createdAt: t.createdAt,
    }));
  }

  /**
   * Debit wallet with idempotency by reference (reference must be unique in DB).
   */
  async deductFromWallet(
    userId: string,
    amount: number,
    reference: string,
  ): Promise<{
    wallet: { id: string; userId: string; balance: number };
    transaction: {
      id: string;
      amount: number;
      type: string;
      status: string;
      reference: string;
      narration?: string | null;
      createdAt: Date;
    };
  }> {
    if (!reference?.trim())
      throw new BadRequestException('reference is required');
    if (!Number.isFinite(amount) || amount <= 0)
      throw new BadRequestException('Amount must be > 0');

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      const currentBalance =
        wallet.balance instanceof Prisma.Decimal
          ? wallet.balance.toNumber()
          : Number(wallet.balance);

      if (currentBalance < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      // Idempotency: if the reference exists already, return it
      const existing = await tx.walletTx.findUnique({
        where: { reference },
      });

      if (existing) {
        const refreshedWallet = await tx.wallet.findUnique({
          where: { id: wallet.id },
        });
        if (!refreshedWallet) throw new NotFoundException('Wallet not found');

        return {
          wallet: {
            id: refreshedWallet.id,
            userId: refreshedWallet.userId,
            balance:
              refreshedWallet.balance instanceof Prisma.Decimal
                ? refreshedWallet.balance.toNumber()
                : Number(refreshedWallet.balance),
          },
          transaction: {
            id: existing.id,
            amount:
              existing.amount instanceof Prisma.Decimal
                ? existing.amount.toNumber()
                : Number(existing.amount),
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
          balance: { decrement: new Prisma.Decimal(amount) },
        },
      });

      const createdTx = await tx.walletTx.create({
        data: {
          walletId: wallet.id,
          amount: new Prisma.Decimal(amount),
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
          balance:
            updatedWallet.balance instanceof Prisma.Decimal
              ? updatedWallet.balance.toNumber()
              : Number(updatedWallet.balance),
        },
        transaction: {
          id: createdTx.id,
          amount:
            createdTx.amount instanceof Prisma.Decimal
              ? createdTx.amount.toNumber()
              : Number(createdTx.amount),
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
