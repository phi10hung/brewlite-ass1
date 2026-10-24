import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../generated/prisma/enums';
import { assertTransition } from '../orders/order-status';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

const PAYMENT_SELECT = {
  id: true,
  orderId: true,
  method: true,
  status: true,
  amount: true,
  createdAt: true,
} as const;

type PaymentView = {
  id: number;
  orderId: number;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  createdAt: Date;
};

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: number,
    idempotencyKey: string | undefined,
    dto: CreatePaymentDto,
  ): Promise<PaymentView> {
    const key = this.requireIdempotencyKey(idempotencyKey);

    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
      select: { id: true, status: true, total: true },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    // Cùng key phải trả lại đúng kết quả cũ, không tạo thêm Payment.
    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey: key },
      select: PAYMENT_SELECT,
    });
    if (existing) {
      this.assertSamePayment(existing, order.id, dto.method);
      return existing;
    }

    const nextStatus = this.resolveNextStatus(order.status, dto.simulate);
    const paymentStatus =
      dto.simulate === 'fail' ? PaymentStatus.FAILED : PaymentStatus.SUCCESS;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            orderId: order.id,
            method: dto.method,
            status: paymentStatus,
            amount: order.total,
            idempotencyKey: key,
          },
          select: PAYMENT_SELECT,
        });

        // PAYMENT_FAILED phải quay về PENDING trước khi thử thanh toán lại.
        let currentStatus = order.status;
        if (currentStatus === OrderStatus.PAYMENT_FAILED) {
          assertTransition(currentStatus, OrderStatus.PENDING);
          const reset = await tx.order.updateMany({
            where: { id: order.id, status: OrderStatus.PAYMENT_FAILED },
            data: { status: OrderStatus.PENDING },
          });
          if (reset.count === 0) {
            throw new ConflictException(
              'Đơn hàng vừa được xử lý bởi một yêu cầu khác',
            );
          }
          currentStatus = OrderStatus.PENDING;
        }

        // Chỉ cập nhật nếu trạng thái vẫn là trạng thái đã đọc, tránh xử lý hai lần.
        assertTransition(currentStatus, nextStatus);
        const updated = await tx.order.updateMany({
          where: { id: order.id, status: currentStatus },
          data: { status: nextStatus },
        });
        if (updated.count === 0) {
          throw new ConflictException(
            'Đơn hàng vừa được xử lý bởi một yêu cầu khác',
          );
        }

        if (paymentStatus === PaymentStatus.SUCCESS) {
          const points = Math.floor(order.total / 10000);
          await tx.user.update({
            where: { id: userId },
            data: { loyaltyPoints: { increment: points } },
          });
          await tx.loyaltyTransaction.create({
            data: { userId, orderId: order.id, points },
          });
        }

        return payment;
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      // Hai request đồng thời cùng key: request thua đọc lại Payment đã thắng.
      const racedPayment = await this.prisma.payment.findUnique({
        where: { idempotencyKey: key },
        select: PAYMENT_SELECT,
      });
      if (!racedPayment) {
        throw new ConflictException(
          'Không thể xác định kết quả thanh toán, vui lòng thử lại',
        );
      }

      this.assertSamePayment(racedPayment, order.id, dto.method);
      return racedPayment;
    }
  }

  private requireIdempotencyKey(key: string | undefined): string {
    const normalized = key?.trim();
    if (!normalized) {
      throw new BadRequestException('Thiếu header Idempotency-Key');
    }
    return normalized;
  }

  private resolveNextStatus(
    current: OrderStatus,
    simulate: 'fail' | undefined,
  ): OrderStatus {
    if (
      current !== OrderStatus.PENDING &&
      current !== OrderStatus.PAYMENT_FAILED
    ) {
      throw new BadRequestException(
        `Không thể thanh toán đơn hàng ở trạng thái ${current}`,
      );
    }

    return simulate === 'fail' ? OrderStatus.PAYMENT_FAILED : OrderStatus.PAID;
  }

  private assertSamePayment(
    payment: PaymentView,
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
