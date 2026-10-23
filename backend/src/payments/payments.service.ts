import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: number,
    idempotencyKey: string | undefined,
    dto: CreatePaymentDto,
  ) {
    const key = this.requireIdempotencyKey(idempotencyKey);

    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
      select: { id: true, total: true },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey: key },
    });
    if (existing) {
      this.assertSamePayment(existing, order.id, dto.method);
      return existing;
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        method: dto.method,
        status: PaymentStatus.SUCCESS,
        amount: order.total,
        idempotencyKey: key,
      },
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'PAID' },
    });

    return payment;
  }

  private requireIdempotencyKey(key: string | undefined): string {
    const normalized = key?.trim();
    if (!normalized) {
      throw new BadRequestException('Thiếu header Idempotency-Key');
    }
    return normalized;
  }

  private assertSamePayment(
    payment: { orderId: number; method: PaymentMethod },
    orderId: number,
    method: PaymentMethod,
  ): void {
    if (payment.orderId !== orderId || payment.method !== method) {
      throw new ConflictException(
        'Idempotency-Key đã được dùng cho một thanh toán khác',
      );
    }
  }
}
