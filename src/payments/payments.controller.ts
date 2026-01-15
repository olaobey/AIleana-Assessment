import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { MonnifyWebhookDto } from './dto/monnify-webhook.dto';
import { VerifyPaymentResponseDto } from './dto/verify-payment.response.dto';
import * as crypto from 'crypto';
import { env } from '../config/env';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('verify/:paymentReference')
  @ApiOperation({ summary: 'Verify payment and credit wallet if PAID' })
  @ApiParam({ name: 'paymentReference', example: 'AIL-1700000000000-acde' })
  @ApiOkResponse({ type: VerifyPaymentResponseDto })
  async verify(
    @Param('paymentReference') paymentReference: string,
  ): Promise<VerifyPaymentResponseDto> {
    const result = await this.paymentsService.verifyAndCredit(paymentReference);

    return {
      status: result.success ? 'SUCCESS' : 'FAILED',
      paymentReference,
    };
  }

  @Post('webhook/monnify')
  @ApiOperation({ summary: 'Monnify webhook receiver' })
  @ApiHeader({ name: 'monnify-signature', required: true })
  @ApiBody({ type: MonnifyWebhookDto })
  async webhook(@Req() req: Request, @Body() body: MonnifyWebhookDto) {
    const signature = req.headers['monnify-signature']

    const computedHash = crypto
      .createHash('sha512')
      .update(JSON.stringify(body) + env.MONNIFY_SECRET_KEY)
      .digest('hex');

    if (signature !== computedHash) {
      throw new UnauthorizedException('Invalid Monnify signature');
    }

    const paymentReference =
      body.eventData?.paymentReference ?? body.paymentReference;

    if (!paymentReference) {
      return { received: true, processed: false };
    }

    const result = await this.paymentsService.verifyAndCredit(paymentReference);

    return { received: true, processed: true, result };
  }
}
