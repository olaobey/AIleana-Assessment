import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MonnifyClient } from './monnify/monnify.client';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, MonnifyClient],
  exports: [PaymentsService],
})
export class PaymentsModule {}
