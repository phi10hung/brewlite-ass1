import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { OrderStatus } from '../generated/prisma/enums';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from './orders.service';

// Đơn còn chờ thanh toán: hết hạn thì tự hủy
const WAITING: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PAYMENT_FAILED,
];

// Tác vụ nền: tự hủy đơn quá hạn thanh toán, thử lại hoàn tiền bị lỗi
@Injectable()
export class OrderExpiryService {
  private readonly logger = new Logger(OrderExpiryService.name);
  // Lần chạy trước chưa xong thì bỏ qua lần này, tránh hủy 1 đơn 2 lần
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly payments: PaymentsService,
  ) {}

  @Interval(30_000)
  async cancelExpiredOrders(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    let cancelled = 0;
    try {
      const expired = await this.prisma.order.findMany({
        where: { status: { in: WAITING }, expiresAt: { lt: new Date() } },
        select: { id: true, code: true },
        orderBy: { id: 'asc' },
      });
      for (const order of expired) {
        if (await this.cancelOne(order.id, order.code)) cancelled++;
      }
    } catch (error) {
      this.logger.warn(`Không tự hủy được đơn quá hạn: ${errorMessage(error)}`);
    } finally {
      this.running = false;
    }
    return cancelled;
  }

  @Interval(60_000)
  retryRefunds(): Promise<void> {
    return this.payments.retryRefunds();
  }

  private async cancelOne(orderId: number, code: string): Promise<boolean> {
    // Hỏi VNPay trước: khách có thể đã trả xong nhưng chưa quay lại trang kết quả
    try {
      const { orderStatus } = await this.payments.syncOrder(orderId);
      if (!WAITING.includes(orderStatus)) return false;
    } catch (error) {
      // Không hỏi được vẫn hủy: nếu khách đã trả, kết quả VNPay gửi về sau sẽ tự hoàn tiền
      this.logger.warn(
        `Không hỏi được VNPay cho đơn ${code}: ${errorMessage(error)}`,
      );
    }

    try {
      await this.orders.cancel(orderId, 'SYSTEM');
      this.logger.log(`Tự hủy đơn quá hạn thanh toán ${code}`);
      return true;
    } catch (error) {
      // Đơn vừa đổi trạng thái (khách vừa trả xong hoặc vừa tự hủy) thì bỏ qua
      this.logger.warn(`Bỏ qua đơn ${code}: ${errorMessage(error)}`);
      return false;
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
