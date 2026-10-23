import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PaymentMethod, PaymentStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async pay(userId: number, orderId: number, method: PaymentMethod) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      select: { id: true, total: true },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        method,
        status: PaymentStatus.SUCCESS,
        amount: order.total,
        idempotencyKey: randomUUID(),
      },
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'PAID' },
    });

    return payment;
  }
}
