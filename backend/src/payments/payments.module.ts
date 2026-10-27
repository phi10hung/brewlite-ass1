import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { VnpayClient } from './vnpay.client';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, VnpayClient],
  exports: [PaymentsService],
})
export class PaymentsModule {}
