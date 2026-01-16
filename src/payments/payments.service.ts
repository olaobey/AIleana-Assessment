import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { MonnifyClient } from './monnify/monnify.client';
import { VerifyAndCreditResult } from './interfaces/verify-and-credit-result.interface';
import { env } from '../config/env';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly monnify: MonnifyClient,
  ) {}

  async initializeWalletTopup(userId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const paymentReference = `AIL-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`;

    const intent = await this.prisma.paymentIntent.create({
      data: {
        userId,
        provider: 'MONNIFY',
        amount,
        currency: 'NGN',
        paymentReference,
        status: PaymentStatus.INITIATED,
      },
    });

    if (env.PAYMENTS_MODE === 'mock') {
      return {
        paymentReference,
        checkoutUrl: `https://mock.monnify/checkout/${paymentReference}`,
      };
    }

    const init = await this.monnify.initTransaction({
      amount,
      customerName:
        `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
        'AIleana User',
      customerEmail: user.email,
      paymentDescription: 'Wallet Top-up',
      contractCode: env.MONNIFY_CONTRACT_CODE,
      redirectUrl: env.MONNIFY_REDIRECT_URL,
      paymentReference,
    });

    if (!init.requestSuccessful) {
      await this.prisma.paymentIntent.update({
        where: { id: intent.id },
        data: { status: PaymentStatus.FAILED },
      });
      throw new BadRequestException(init.responseMessage);
    }

    await this.prisma.paymentIntent.update({
      where: { id: intent.id },
      data: {
        monnifyTransactionReference: init.responseBody.transactionReference,
        checkoutUrl: init.responseBody.checkoutUrl,
        status: PaymentStatus.PENDING,
      },
    });

    return {
      paymentReference,
      checkoutUrl: init.responseBody.checkoutUrl,
    };
  }

  async verifyAndCredit(
    paymentReference: string,
  ): Promise<VerifyAndCreditResult> {
    const intent = await this.prisma.paymentIntent.findUnique({
      where: { paymentReference },
    });

    if (!intent) throw new NotFoundException('Payment intent not found');

    if (intent.status === PaymentStatus.PAID) {
      return {
        success: true,
        message: 'Already credited',
        transactionId: intent.id,
        amount: Number(intent.amount),
        credited: true,
      };
    }

    if (env.PAYMENTS_MODE === 'mock') {
      return this.creditWallet(intent.id);
    }

    const statusResp =
      await this.monnify.getTransactionStatusByPaymentReference(
        paymentReference,
      );

    if (!statusResp.requestSuccessful) {
      throw new BadRequestException('Verification failed');
    }

    if (statusResp.responseBody.paymentStatus !== 'PAID') {
      return {
        success: false,
        message: 'Payment not completed',
        transactionId: intent.id,
        amount: Number(intent.amount),
        credited: false,
      };
    }

    return this.creditWallet(intent.id);
  }

  private async creditWallet(intentId: string): Promise<VerifyAndCreditResult> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const intent = await tx.paymentIntent.findUnique({
        where: { id: intentId },
      });

      if (!intent) throw new NotFoundException('Payment intent not found');

      if (intent.status === PaymentStatus.PAID) {
        return {
          success: true,
          message: 'Already credited',
          transactionId: intent.id,
          amount: Number(intent.amount),
          credited: true,
        };
      }

      const wallet = await tx.wallet.findUnique({
        where: { userId: intent.userId },
      });

      if (!wallet) throw new NotFoundException('Wallet not found');

      await tx.walletTx.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          amount: intent.amount,
          status: 'SUCCESS',
          reference: `TOPUP:${intent.paymentReference}`,
          narration: 'Wallet top-up via Monnify',
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: intent.amount } },
      });

      await tx.paymentIntent.update({
        where: { id: intent.id },
        data: { status: PaymentStatus.PAID },
      });

      return {
        success: true,
        message: 'Wallet credited successfully',
        transactionId: intent.id,
        amount: Number(intent.amount),
        credited: true,
      };
    });
  }
}
