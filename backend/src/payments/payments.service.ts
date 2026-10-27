import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../generated/prisma/enums';
import { assertTransition } from '../orders/order-status';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VnpayClient } from './vnpay.client';

const PAYMENT_SELECT = {
  id: true,
  orderId: true,
  method: true,
  status: true,
  amount: true,
  payUrl: true,
  createdAt: true,
} as const;

type PaymentView = {
  id: number;
  orderId: number;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  payUrl: string | null;
  createdAt: Date;
};

const TXN_REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_TXN_REF_ATTEMPTS = 3;

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

function uniqueTarget(error: unknown): string[] {
  if (typeof error !== 'object' || error === null || !('meta' in error)) {
    return [];
  }

  const meta = (error as { meta?: unknown }).meta;
  if (!meta || typeof meta !== 'object' || !('target' in meta)) {
    return [];
  }

  const target = (meta as { target?: unknown }).target;
  if (Array.isArray(target)) {
    return target.filter((value): value is string => typeof value === 'string');
  }
  return typeof target === 'string' ? [target] : [];
}

function randomTxnSuffix(): string {
  return [...randomBytes(6)]
    .map((byte) => TXN_REF_CHARS[byte % TXN_REF_CHARS.length])
    .join('');
}

function generateTxnRef(orderCode: string): string {
  const base = orderCode.replace(/[^A-Za-z0-9]/g, '').slice(0, 94);
  return `${base}${randomTxnSuffix()}`;
}

@Injectable()
export class PaymentsService {
  private readonly paymentMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly vnpay: VnpayClient,
    config: ConfigService,
  ) {
    const minutes = Number(config.get<string>('ORDER_PAYMENT_MINUTES') ?? 5);
    this.paymentMinutes =
      Number.isFinite(minutes) && minutes > 0 ? minutes : 5;
  }

  async create(
    userId: number,
    idempotencyKey: string | undefined,
    dto: CreatePaymentDto,
    ipAddr?: string,
  ): Promise<PaymentView> {
    const key = this.requireIdempotencyKey(idempotencyKey);

    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
      select: {
        id: true,
        code: true,
        status: true,
        total: true,
        expiresAt: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    // Cùng key phải trả lại đúng kết quả cũ, không tạo thêm Payment.
    const existing = await this.findExistingPayment(key);
    if (existing) {
      this.assertSamePayment(existing, order.id, dto.method);
      return existing;
    }

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.PAYMENT_FAILED
    ) {
      throw new BadRequestException(
        `Không thể thanh toán đơn hàng ở trạng thái ${order.status}`,
      );
    }

    // Hạn thanh toán bắt đầu khi tạo link VNPay. Đơn đã có hạn thì giữ nguyên.
    const expiresAt = order.expiresAt ?? this.expiresAtFromNow();
    if (expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Đơn đã hết thời gian thanh toán');
    }

    for (let attempt = 1; attempt <= MAX_TXN_REF_ATTEMPTS; attempt++) {
      const txnRef = generateTxnRef(order.code);
      const payUrl = this.vnpay.buildPayUrl({
        txnRef,
        amount: order.total,
        orderInfo: `Thanh toan don ${order.code}`,
        ipAddr: ipAddr ?? '127.0.0.1',
        expiresAt,
        bankCode: dto.method === PaymentMethod.CARD ? 'VNBANK' : undefined,
      });

      try {
        return await this.prisma.$transaction(async (tx) => {
          const payment = await tx.payment.create({
            data: {
              orderId: order.id,
              method: dto.method,
              status: PaymentStatus.PENDING,
              amount: order.total,
              idempotencyKey: key,
              txnRef,
              payUrl,
            },
            select: PAYMENT_SELECT,
          });

          const data: {
            status?: OrderStatus;
            paymentMethod: PaymentMethod;
            expiresAt: Date;
          } = {
            paymentMethod: dto.method,
            expiresAt,
          };

          // PAYMENT_FAILED phải quay về PENDING trước khi tạo link mới.
          if (order.status === OrderStatus.PAYMENT_FAILED) {
            assertTransition(order.status, OrderStatus.PENDING);
            data.status = OrderStatus.PENDING;
          }

          const updated = await tx.order.updateMany({
            where: { id: order.id, status: order.status },
            data,
          });
          if (updated.count === 0) {
            throw new ConflictException(
              'Đơn hàng vừa được xử lý bởi một yêu cầu khác',
            );
          }

          return payment;
        });
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }

        // P2002 có thể do trùng idempotencyKey (request đồng thời) hoặc txnRef.
        const raced = await this.findExistingPayment(key);
        if (raced) {
          this.assertSamePayment(raced, order.id, dto.method);
          return raced;
        }

        const target = uniqueTarget(error);
        if (target.includes('idempotencyKey')) {
          throw new ConflictException(
            'Không thể xác định kết quả thanh toán, vui lòng thử lại',
          );
        }

        if (target.includes('txnRef') || target.length === 0) {
          if (attempt === MAX_TXN_REF_ATTEMPTS) {
            throw new ConflictException(
              'Không thể tạo mã giao dịch VNPay, vui lòng thử lại',
            );
          }
          continue;
        }

        throw error;
      }
    }

    throw new ConflictException(
      'Không thể tạo mã giao dịch VNPay, vui lòng thử lại',
    );
  }

  private findExistingPayment(key: string) {
    return this.prisma.payment.findUnique({
      where: { idempotencyKey: key },
      select: PAYMENT_SELECT,
    });
  }

  private expiresAtFromNow(): Date {
    return new Date(Date.now() + this.paymentMinutes * 60_000);
  }

  private requireIdempotencyKey(key: string | undefined): string {
    const normalized = key?.trim();
    if (!normalized) {
      throw new BadRequestException('Thiếu header Idempotency-Key');
    }
    return normalized;
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
