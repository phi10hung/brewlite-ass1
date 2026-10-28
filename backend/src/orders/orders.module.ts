import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [PromotionsModule, PaymentsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  // Búp (nhân viên hủy) và Hùng (tự hủy đơn quá hạn) dùng OrdersService.cancel
  exports: [OrdersService],
})
export class OrdersModule {}