import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { StaffController } from './staff.controller';
import { StaffIngredientsController } from './staff-ingredients.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [OrdersModule],
  controllers: [StaffController, StaffIngredientsController],
  providers: [StaffService],
})
export class StaffModule {}