import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentStatus } from '../generated/prisma/enums';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';
import type {
  ApplyResult,
  IpnResponse,
  SyncResult,
} from './payments.service';

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

  @Get('vnpay-return')
  async vnpayReturn(
    @Query() query: Record<string, unknown>,
    @Ip() ipAddr: string,
  ): Promise<ApplyResult> {
    return this.paymentsService.handleReturn(query, ipAddr);
  }

  @Get('vnpay-ipn')
  async vnpayIpn(
    @Query() query: Record<string, unknown>,
  ): Promise<IpnResponse> {
    return this.paymentsService.handleIpn(query);
  }

  @Post(':orderId/sync')
  @UseGuards(JwtAuthGuard)
  async sync(
    @CurrentUser() user: AuthUser,
    @Param('orderId', ParseIntPipe) orderId: number,
  ): Promise<SyncResult> {
    return this.paymentsService.syncForUser(user.userId, orderId);
  }
}
