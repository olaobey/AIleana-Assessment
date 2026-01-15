import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CallStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { env } from '../config/env';

@Injectable()
export class CallsService {
  private readonly callRatePerMinute: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {
    this.callRatePerMinute = Number(env.CALL_RATE_PER_MINUTE); // ensure it's a number
  }

  async initiateCall(callerId: string, receiverId: string) {
    const calleeId = receiverId;

    if (callerId === calleeId) {
      throw new BadRequestException('Cannot call yourself');
    }

    const callee = await this.prisma.user.findUnique({
      where: { id: calleeId },
    });
    if (!callee) throw new NotFoundException('Receiver not found');

    // Ensure caller has at least 1 minute
    const callerWallet = await this.walletService.getWallet(callerId);
    if (callerWallet.balance < this.callRatePerMinute) {
      throw new BadRequestException('Insufficient balance to initiate call');
    }

    const call = await this.prisma.callSession.create({
      data: {
        callerId,
        calleeId,
        status: CallStatus.INITIATED,
      },
      include: {
        caller: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        callee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    return {
      call,
      message: 'Call initiated successfully',
      signalingData: {
        callId: call.id,
        type: 'offer' as const,
        sdp: 'mock-sdp-offer-data',
      },
    };
  }

  async updateCallStatus(callId: string, status: CallStatus, userId: string) {
    const call = await this.prisma.callSession.findUnique({
      where: { id: callId },
    });
    if (!call) throw new NotFoundException('Call not found');

    // Verify user is part of the call
    if (call.callerId !== userId && call.calleeId !== userId) {
      throw new ForbiddenException('You are not part of this call');
    }

    // Allowed transitions (simple but safe)
    const allowedNext: Record<CallStatus, CallStatus[]> = {
      INITIATED: [CallStatus.RINGING, CallStatus.FAILED, CallStatus.ENDED],
      RINGING: [CallStatus.ACCEPTED, CallStatus.FAILED, CallStatus.ENDED],
      ACCEPTED: [CallStatus.ENDED, CallStatus.FAILED],
      ENDED: [],
      FAILED: [],
    };

    if (!allowedNext[call.status].includes(status)) {
      throw new BadRequestException(
        `Invalid status transition: ${call.status} -> ${status}`,
      );
    }

    const updateData: Prisma.CallSessionUpdateInput = { status };

    // timestamps
    if (status === CallStatus.RINGING && !call.startedAt) {
      updateData.startedAt = new Date();
    }

    if (status === CallStatus.ACCEPTED && !call.acceptedAt) {
      updateData.acceptedAt = new Date();
      // If startedAt wasn't set at RINGING stage, set now
      if (!call.startedAt) updateData.startedAt = new Date();
    }

    if (
      (status === CallStatus.ENDED || status === CallStatus.FAILED) &&
      !call.endedAt
    ) {
      updateData.endedAt = new Date();
    }

    // Charge caller when call ENDS (only if it was accepted & had a start time)
    // idempotency handled by walletService reference unique
    if (status === CallStatus.ENDED && call.startedAt) {
      const now = new Date();
      const durationSecs = Math.max(
        0,
        Math.floor((now.getTime() - call.startedAt.getTime()) / 1000),
      );
      const durationMinutes = Math.max(1, Math.ceil(durationSecs / 60));
      const cost = durationMinutes * this.callRatePerMinute;

      try {
        await this.walletService.deductFromWallet(
          call.callerId,
          cost,
          `CALL-${callId}`,
        );
      } catch {
        // if charging fails, mark as FAILED (business decision)
        updateData.status = CallStatus.FAILED;
      }
    }

    const updatedCall = await this.prisma.callSession.update({
      where: { id: callId },
      data: updateData,
      include: {
        caller: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        callee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    return updatedCall;
  }

  async getCallHistory(userId: string) {
    return this.prisma.callSession.findMany({
      where: {
        OR: [{ callerId: userId }, { calleeId: userId }],
      },
      include: {
        caller: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        callee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getCallById(callId: string, userId: string) {
    const call = await this.prisma.callSession.findUnique({
      where: { id: callId },
      include: {
        caller: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        callee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!call) throw new NotFoundException('Call not found');

    if (call.callerId !== userId && call.calleeId !== userId) {
      throw new ForbiddenException('You are not authorized to view this call');
    }

    return call;
  }
}
