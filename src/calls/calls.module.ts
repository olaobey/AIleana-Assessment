import { Module } from '@nestjs/common';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { WalletModule } from '../wallet/wallet.module';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule, WalletModule],
  controllers: [CallsController],
  providers: [CallsService],
})
export class CallsModule {}
