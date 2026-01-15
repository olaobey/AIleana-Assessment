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
    private prisma: PrismaService,
    private monnify: MonnifyClient,
  ) {}

  async initializeWalletTopup(userId: string, amount: number) {
    if (amount <= 0) throw new BadRequestException('Amount must be > 0');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const paymentReference = `AIL-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const intent = await this.prisma.paymentIntent.create({
      data: {
        userId,
        provider: 'MONNIFY',
        amount: new Prisma.Decimal(amount),
        currency: 'NGN',
        paymentReference,
        status: 'INITIATED',
      },
    });

    // mock mode
    if (env.PAYMENTS_MODE === 'mock') {
      return {
        paymentReference: intent.paymentReference,
        checkoutUrl: `https://mock.monnify/checkout/${intent.paymentReference}`,
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
        data: { status: 'FAILED' },
      });
      throw new BadRequestException(
        init.responseMessage ?? 'Monnify init failed',
      );
    }

    await this.prisma.paymentIntent.update({
      where: { id: intent.id },
      data: {
        monnifyTransactionReference: init.responseBody.transactionReference,
        checkoutUrl: init.responseBody.checkoutUrl,
        status: 'PENDING',
      },
    });

    return {
      paymentReference,
      checkoutUrl: init.responseBody.checkoutUrl,
      monnifyTransactionReference: init.responseBody.transactionReference,
    };
  }

  /**
   * Verify payment and credit wallet (idempotent)
   */
  async verifyAndCredit(
    paymentReference: string,
  ): Promise<VerifyAndCreditResult> {
    const intent = await this.prisma.paymentIntent.findUnique({
      where: { paymentReference },
    });
    if (!intent) throw new NotFoundException('Payment intent not found');

    // Already credited
    if (intent.status === PaymentStatus.PAID) {
      return {
        success: true,
        message: 'Payment already verified and wallet credited',
        transactionId: intent.id,
        amount: Number(intent.amount), // convert Decimal to number
        credited: true,
      };
    }

    if (env.PAYMENTS_MODE === 'mock') {
      // treat as paid in mock
      return this.creditWalletForIntent(intent.id, 'PAID'); // pass both args
    }

    const statusResp =
      await this.monnify.getTransactionStatusByPaymentReference(
        paymentReference,
      );
    if (!statusResp.requestSuccessful)
      throw new BadRequestException('Could not verify payment');

    const paymentStatus = statusResp.responseBody.paymentStatus;

    if (paymentStatus !== 'PAID') {
      await this.prisma.paymentIntent.update({
        where: { id: intent.id },
        data: { status: paymentStatus === 'FAILED' ? 'FAILED' : 'PENDING' },
      });
    }

    return {
      success: paymentStatus === 'PAID',
      message: `Payment is ${paymentStatus}`,
      transactionId: intent.id,
      amount: Number(intent.amount), // convert Decimal to number
      credited: paymentStatus === 'PAID',
    };
  }
  private async creditWalletForIntent(
    intentId: string,
    paidStatus: 'PAID',
  ): Promise<VerifyAndCreditResult> {
    return this.prisma.$transaction(async (tx) => {
      const intent = await tx.paymentIntent.findUnique({
        where: { id: intentId },
      });
      if (!intent) throw new NotFoundException('Payment intent not found');

      // idempotency: if already PAID, do nothing
      if (intent.status === 'PAID') {
        return {
          success: true,
          message: 'Payment already verified and wallet credited',
          transactionId: intent.id,
          amount: Number(intent.amount), // convert Decimal
          credited: true,
        };
      }

      const wallet = await tx.wallet.findUnique({
        where: { userId: intent.userId },
      });
      if (!wallet) throw new NotFoundException('Wallet not found');

      // idempotency for ledger entry: unique(reference)
      const txRef = `TOPUP:${intent.paymentReference}`;

      await tx.walletTx.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          amount: intent.amount,
          status: 'SUCCESS',
          reference: txRef,
          narration: 'Wallet top-up via Monnify',
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: intent.amount } },
      });

      await tx.paymentIntent.update({
        where: { id: intent.id },
        data: { status: paidStatus },
      });

      return {
        success: true,
        message: 'Wallet credited successfully',
        transactionId: intent.id,
        amount: Number(intent.amount), // convert Decimal
        credited: true,
      };
    });
  }
}
