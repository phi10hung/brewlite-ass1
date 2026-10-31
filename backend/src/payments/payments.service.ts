import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import type { Prisma } from '../generated/prisma/client';
import {
  LoyaltyType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
} from '../generated/prisma/enums';
import { assertTransition } from '../orders/order-status';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VnpayClient } from './vnpay.client';
import type { RefundResult } from './vnpay.client';

const PAYMENT_SELECT = {
  id: true,
  orderId: true,
  method: true,
  status: true,
  amount: true,
  payUrl: true,
  createdAt: true,
} as const;

const PAYMENT_RESULT_SELECT = {
  id: true,
  orderId: true,
  status: true,
  amount: true,
  txnRef: true,
  transactionNo: true,
  payDate: true,
  refundStatus: true,
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

type PaymentForResult = {
  id: number;
  orderId: number;
  status: PaymentStatus;
  amount: number;
  txnRef: string | null;
  createdAt: Date;
};

export type VnpayPaymentResult = {
  responseCode: string;
  transactionStatus: string;
  transactionNo: string;
  payDate: string;
};

export type ResultKind = 'SUCCESS' | 'FAILED' | 'PENDING';

// querydr: ResponseCode là kết quả của câu hỏi, TransactionStatus mới là giao dịch.
function kindFromQuery(result: VnpayPaymentResult): ResultKind {
  if (result.responseCode !== '00') return 'PENDING';
  if (result.transactionStatus === '00') return 'SUCCESS';
  if (result.transactionStatus === '02') return 'FAILED';
  return 'PENDING';
}

// Return URL/IPN: ResponseCode là kết quả thanh toán do VNPay gửi về.
function kindFromCallback(result: VnpayPaymentResult): ResultKind {
  if (result.responseCode === '00' && result.transactionStatus === '00') {
    return 'SUCCESS';
  }
  // Không có mã kết quả (mở lại link thanh toán gốc): chưa biết gì, giữ nguyên đơn
  if (!result.responseCode) return 'PENDING';
  if (result.responseCode !== '00') return 'FAILED';
  return 'PENDING';
}

export type ApplyResult = {
  orderId: number;
  orderStatus: OrderStatus;
  success: boolean;
};

export type SyncResult = {
  orderStatus: OrderStatus;
};

export type IpnResponse = {
  RspCode: string;
  Message: string;
};

type ApplyOutcome = ApplyResult & {
  refundNeeded: boolean;
};

const TXN_REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_TXN_REF_ATTEMPTS = 3;
const SYNC_INTERVAL_MS = 5_000;

const IPN_RESPONSES = {
  SUCCESS: { RspCode: '00', Message: 'Confirm Success' },
  ORDER_NOT_FOUND: { RspCode: '01', Message: 'Order not found' },
  ALREADY_CONFIRMED: { RspCode: '02', Message: 'Order already confirmed' },
  INVALID_AMOUNT: { RspCode: '04', Message: 'Invalid amount' },
  INVALID_SIGNATURE: { RspCode: '97', Message: 'Invalid signature' },
  UNKNOWN_ERROR: { RspCode: '99', Message: 'Unknown error' },
} as const satisfies Record<string, IpnResponse>;

function readQueryString(
  query: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = query[key];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === 'string');
    return typeof first === 'string' ? first : undefined;
  }
  return undefined;
}

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
  private readonly logger = new Logger(PaymentsService.name);
  private readonly lastSyncAt = new Map<number, number>();
  private readonly refunding = new Set<number>();
  private readonly paymentMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly vnpay: VnpayClient,
    config: ConfigService,
  ) {
    const minutes = Number(config.get<string>('ORDER_PAYMENT_MINUTES') ?? 5);
    this.paymentMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 5;
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

    // Dùng chung một mốc thời gian cho link VNPay và Payment để querydr khớp ngày.
    const createdAt = new Date();

    for (let attempt = 1; attempt <= MAX_TXN_REF_ATTEMPTS; attempt++) {
      const txnRef = generateTxnRef(order.code);
      const payUrl = this.vnpay.buildPayUrl({
        txnRef,
        amount: order.total,
        orderInfo: `Thanh toan don ${order.code}`,
        ipAddr: ipAddr ?? '127.0.0.1',
        createDate: createdAt,
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
              createdAt,
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

  async handleReturn(
    query: Record<string, unknown>,
    ipAddr?: string,
  ): Promise<ApplyResult> {
    if (!this.vnpay.verifyReturn(query)) {
      throw new BadRequestException('Chữ ký VNPay không hợp lệ');
    }

    const txnRef = readQueryString(query, 'vnp_TxnRef')?.trim();
    if (!txnRef) {
      throw new BadRequestException('Thiếu mã giao dịch VNPay');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { txnRef },
      select: PAYMENT_RESULT_SELECT,
    });
    if (!payment) {
      throw new NotFoundException('Không tìm thấy thanh toán');
    }

    // Kết quả VNPay gửi kèm trên Return URL (chữ ký đã kiểm tra ở trên)
    const callback: VnpayPaymentResult = {
      responseCode: readQueryString(query, 'vnp_ResponseCode') ?? '',
      transactionStatus: readQueryString(query, 'vnp_TransactionStatus') ?? '',
      transactionNo: readQueryString(query, 'vnp_TransactionNo') ?? '',
      payDate: readQueryString(query, 'vnp_PayDate') ?? '',
    };
    const amount = Number(readQueryString(query, 'vnp_Amount'));
    if (amount !== payment.amount * 100) {
      throw new BadRequestException('Số tiền VNPay không khớp với đơn hàng');
    }

    // Ưu tiên hỏi lại VNPay: VNPay trả lời rõ thành công / thất bại thì theo VNPay.
    let queried: VnpayPaymentResult | null = null;
    try {
      queried = await this.vnpay.queryTransaction({
        txnRef,
        transactionDate: payment.createdAt,
        ipAddr,
      });
    } catch (error) {
      this.logger.warn(
        `Không truy vấn được VNPay cho ${txnRef}: ${this.errorMessage(error)}`,
      );
    }
    if (queried) {
      const kind = kindFromQuery(queried);
      if (kind !== 'PENDING') {
        return this.applyResult(payment, queried, kind);
      }
    }

    // VNPay lỗi (vd mã 99) hoặc chưa kịp ghi nhận: dùng kết quả trên Return URL.
    // Chữ ký tạo bằng khoá bí mật của quán nên kết quả này không giả được.
    return this.applyResult(payment, callback, kindFromCallback(callback));
  }

  async handleIpn(query: Record<string, unknown>): Promise<IpnResponse> {
    if (!this.vnpay.verifyReturn(query)) {
      return IPN_RESPONSES.INVALID_SIGNATURE;
    }

    const txnRef = readQueryString(query, 'vnp_TxnRef')?.trim();
    if (!txnRef) {
      return IPN_RESPONSES.ORDER_NOT_FOUND;
    }

    const payment = await this.prisma.payment.findUnique({
      where: { txnRef },
      select: PAYMENT_RESULT_SELECT,
    });
    if (!payment) {
      return IPN_RESPONSES.ORDER_NOT_FOUND;
    }

    const amount = Number(readQueryString(query, 'vnp_Amount'));
    if (!Number.isSafeInteger(amount) || amount !== payment.amount * 100) {
      return IPN_RESPONSES.INVALID_AMOUNT;
    }

    if (payment.status !== PaymentStatus.PENDING) {
      return IPN_RESPONSES.ALREADY_CONFIRMED;
    }

    const result: VnpayPaymentResult = {
      responseCode: readQueryString(query, 'vnp_ResponseCode') ?? '',
      transactionStatus: readQueryString(query, 'vnp_TransactionStatus') ?? '',
      transactionNo: readQueryString(query, 'vnp_TransactionNo') ?? '',
      payDate: readQueryString(query, 'vnp_PayDate') ?? '',
    };

    try {
      await this.applyResult(payment, result, kindFromCallback(result));
    } catch (error) {
      this.logger.warn(
        `Xử lý IPN VNPay thất bại cho ${txnRef}: ${this.errorMessage(error)}`,
      );
      return IPN_RESPONSES.UNKNOWN_ERROR;
    }

    return IPN_RESPONSES.SUCCESS;
  }

  async syncForUser(userId: number, orderId: number): Promise<SyncResult> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      select: { id: true },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    return this.syncOrder(orderId);
  }

  async syncOrder(orderId: number): Promise<SyncResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        orderId,
        status: PaymentStatus.PENDING,
        txnRef: { not: null },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: PAYMENT_RESULT_SELECT,
    });
    const txnRef = payment?.txnRef;
    if (!payment || !txnRef) {
      return { orderStatus: order.status };
    }

    // VNPay giới hạn truy vấn trùng (mã 94): mỗi Payment chỉ hỏi tối đa 1 lần/5 giây.
    const now = Date.now();
    const lastQueriedAt = this.lastSyncAt.get(payment.id);
    if (lastQueriedAt !== undefined && now - lastQueriedAt < SYNC_INTERVAL_MS) {
      return { orderStatus: await this.currentOrderStatus(orderId) };
    }

    this.lastSyncAt.set(payment.id, now);
    try {
      const result = await this.vnpay.queryTransaction({
        txnRef,
        transactionDate: payment.createdAt,
      });
      const applied = await this.applyResult(
        payment,
        result,
        kindFromQuery(result),
      );
      return { orderStatus: applied.orderStatus };
    } catch (error) {
      this.lastSyncAt.delete(payment.id);
      throw error;
    }
  }

  async applyResult(
    payment: PaymentForResult,
    result: VnpayPaymentResult,
    kind: ResultKind,
  ): Promise<ApplyResult> {
    if (kind === 'PENDING') {
      return {
        orderId: payment.orderId,
        orderStatus: await this.currentOrderStatus(payment.orderId),
        success: payment.status === PaymentStatus.SUCCESS,
      };
    }

    const success = kind === 'SUCCESS';

    const outcome = await this.prisma.$transaction(
      async (tx): Promise<ApplyOutcome> => {
        const current = await tx.payment.findUnique({
          where: { id: payment.id },
          select: {
            id: true,
            orderId: true,
            status: true,
            amount: true,
          },
        });
        if (!current) {
          throw new NotFoundException('Không tìm thấy thanh toán');
        }

        const order = await tx.order.findUnique({
          where: { id: current.orderId },
          select: { id: true, status: true, userId: true },
        });
        if (!order) {
          throw new NotFoundException('Không tìm thấy đơn hàng');
        }

        // Payment đã xử lý rồi: giữ nguyên Payment và đơn.
        if (current.status !== PaymentStatus.PENDING) {
          return {
            orderId: order.id,
            orderStatus: order.status,
            success: current.status === PaymentStatus.SUCCESS,
            refundNeeded: false,
          };
        }

        if (success) {
          const updatedPayment = await tx.payment.updateMany({
            where: { id: current.id, status: PaymentStatus.PENDING },
            data: {
              status: PaymentStatus.SUCCESS,
              transactionNo: result.transactionNo || null,
              payDate: result.payDate || null,
            },
          });

          if (updatedPayment.count === 0) {
            return this.currentOutcome(tx, current.id, order.id, order.status);
          }

          // Chỉ một kết quả thắng được chuyển PENDING -> PAID và cộng điểm.
          const paid = await tx.order.updateMany({
            where: { id: order.id, status: OrderStatus.PENDING },
            data: { status: OrderStatus.PAID },
          });
          if (paid.count === 1) {
            await this.awardLoyaltyPoints(
              tx,
              order.id,
              order.userId,
              current.amount,
            );
            return {
              orderId: order.id,
              orderStatus: OrderStatus.PAID,
              success: true,
              refundNeeded: false,
            };
          }

          const latestOrder = await tx.order.findUnique({
            where: { id: order.id },
            select: { status: true },
          });
          const orderStatus = latestOrder?.status ?? order.status;
          return {
            orderId: order.id,
            orderStatus,
            success: true,
            refundNeeded: orderStatus === OrderStatus.CANCELLED,
          };
        }

        const updatedPayment = await tx.payment.updateMany({
          where: { id: current.id, status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.FAILED },
        });
        if (updatedPayment.count === 0) {
          return this.currentOutcome(tx, current.id, order.id, order.status);
        }

        await tx.order.updateMany({
          where: { id: order.id, status: OrderStatus.PENDING },
          data: { status: OrderStatus.PAYMENT_FAILED },
        });
        const latestOrder = await tx.order.findUnique({
          where: { id: order.id },
          select: { status: true },
        });

        return {
          orderId: order.id,
          orderStatus: latestOrder?.status ?? order.status,
          success: false,
          refundNeeded: false,
        };
      },
    );

    if (outcome.refundNeeded) {
      try {
        await this.refundOrder(outcome.orderId);
      } catch (error) {
        this.logger.warn(
          `Không thể hoàn tiền đơn ${outcome.orderId}: ${this.errorMessage(error)}`,
        );
      }
    }

    return {
      orderId: outcome.orderId,
      orderStatus: outcome.orderStatus,
      success: outcome.success,
    };
  }

  async revokeLoyaltyPoints(
    tx: Prisma.TransactionClient,
    orderId: number,
  ): Promise<void> {
    const earn = await tx.loyaltyTransaction.findUnique({
      where: { orderId_type: { orderId, type: LoyaltyType.EARN } },
      select: { userId: true, points: true },
    });
    if (!earn) return;

    const revoked = await tx.loyaltyTransaction.findUnique({
      where: { orderId_type: { orderId, type: LoyaltyType.REVOKE } },
      select: { id: true },
    });
    if (revoked) return;

    const user = await tx.user.findUnique({
      where: { id: earn.userId },
      select: { loyaltyPoints: true },
    });
    const pointsToRevoke = Math.max(
      0,
      Math.min(earn.points, user?.loyaltyPoints ?? 0),
    );

    if (pointsToRevoke > 0) {
      await tx.user.update({
        where: { id: earn.userId },
        data: { loyaltyPoints: { decrement: pointsToRevoke } },
      });
    }
    await tx.loyaltyTransaction.create({
      data: {
        userId: earn.userId,
        orderId,
        type: LoyaltyType.REVOKE,
        points: -pointsToRevoke,
      },
    });
  }

  async refundOrder(orderId: number): Promise<void> {
    if (this.refunding.has(orderId)) return;
    this.refunding.add(orderId);

    try {
      const payment = await this.prisma.payment.findFirst({
        where: { orderId, status: PaymentStatus.SUCCESS },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: PAYMENT_RESULT_SELECT,
      });
      if (!payment || payment.refundStatus === RefundStatus.SUCCESS) {
        return;
      }

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { refundStatus: RefundStatus.PENDING },
      });

      let result: RefundResult;
      try {
        result = await this.vnpay.refund({
          txnRef: payment.txnRef ?? '',
          amount: payment.amount,
          transactionNo: payment.transactionNo ?? '',
          // VNPay yêu cầu giống vnp_CreateDate của lệnh thanh toán, không phải vnp_PayDate
          transactionDate: payment.createdAt,
          createBy: 'BrewLite',
        });
      } catch (error) {
        await this.markRefundFailed(payment.id, orderId, error);
        return;
      }

      if (result.responseCode === '00') {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            refundStatus: RefundStatus.SUCCESS,
            refundedAt: new Date(),
          },
        });
        return;
      }

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { refundStatus: RefundStatus.FAILED },
      });
      this.logger.warn(
        `Hoàn tiền VNPay thất bại cho đơn ${orderId}: ${result.responseCode} ${result.message}`,
      );
    } catch (error) {
      this.logger.warn(
        `Không thể hoàn tiền đơn ${orderId}: ${this.errorMessage(error)}`,
      );
    } finally {
      this.refunding.delete(orderId);
    }
  }

  async retryRefunds(): Promise<void> {
    const cutoff = new Date(Date.now() - 60_000);

    try {
      const payments = await this.prisma.payment.findMany({
        where: {
          refundStatus: {
            in: [RefundStatus.PENDING, RefundStatus.FAILED],
          },
          createdAt: { lt: cutoff },
        },
        select: { orderId: true },
        distinct: ['orderId'],
      });

      for (const payment of payments) {
        await this.refundOrder(payment.orderId);
      }
    } catch (error) {
      this.logger.warn(
        `Không thể thử lại hoàn tiền: ${this.errorMessage(error)}`,
      );
    }
  }

  private async markRefundFailed(
    paymentId: number,
    orderId: number,
    error: unknown,
  ): Promise<void> {
    try {
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { refundStatus: RefundStatus.FAILED },
      });
    } catch (updateError) {
      this.logger.warn(
        `Không cập nhật được trạng thái hoàn tiền đơn ${orderId}: ${this.errorMessage(updateError)}`,
      );
    }
    this.logger.warn(
      `Hoàn tiền VNPay lỗi cho đơn ${orderId}: ${this.errorMessage(error)}`,
    );
  }

  private async currentOutcome(
    tx: Prisma.TransactionClient,
    paymentId: number,
    orderId: number,
    fallbackStatus: OrderStatus,
  ): Promise<ApplyOutcome> {
    const latestPayment = await tx.payment.findUnique({
      where: { id: paymentId },
      select: { status: true },
    });
    const latestOrder = await tx.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });

    return {
      orderId,
      orderStatus: latestOrder?.status ?? fallbackStatus,
      success: latestPayment?.status === PaymentStatus.SUCCESS,
      refundNeeded: false,
    };
  }

  private async awardLoyaltyPoints(
    tx: Prisma.TransactionClient,
    orderId: number,
    userId: number,
    amount: number,
  ): Promise<void> {
    const existing = await tx.loyaltyTransaction.findUnique({
      where: { orderId_type: { orderId, type: LoyaltyType.EARN } },
      select: { id: true },
    });
    if (existing) return;

    const points = Math.floor(amount / 10_000);
    await tx.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { increment: points } },
    });
    await tx.loyaltyTransaction.create({
      data: { userId, orderId, type: LoyaltyType.EARN, points },
    });
  }

  private async currentOrderStatus(orderId: number): Promise<OrderStatus> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    return order.status;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
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
