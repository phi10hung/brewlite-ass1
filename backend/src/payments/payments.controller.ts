import {
  Body,
  Controller,
  Headers,
  Ip,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentStatus } from '../generated/prisma/enums';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

type PaymentResponse = {
  id: number;
  status: PaymentStatus;
  amount: number;
  payUrl: string | null;
};

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() user: AuthUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreatePaymentDto,
    @Ip() ipAddr: string,
  ): Promise<PaymentResponse> {
    const payment = await this.paymentsService.create(
      user.userId,
      idempotencyKey,
      dto,
      ipAddr,
    );

    return {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      payUrl: payment.payUrl,
    };
  }
}
