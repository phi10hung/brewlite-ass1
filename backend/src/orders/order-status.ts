import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../generated/prisma/enums';

// Luồng chính: PENDING -> PAID -> PREPARING -> READY -> COMPLETED.
// Ngoại lệ: PAYMENT_FAILED quay lại PENDING để thử lại; có thể hủy từ PENDING,
// PAYMENT_FAILED, PREPARING, READY nhưng tuyệt đối không hủy từ PAID.
const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> =
  {
    PENDING: [
      OrderStatus.PAID,
      OrderStatus.PAYMENT_FAILED,
      OrderStatus.CANCELLED,
    ],
    PAYMENT_FAILED: [OrderStatus.PENDING, OrderStatus.CANCELLED],
    PAID: [OrderStatus.PREPARING],
    PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
    READY: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
    COMPLETED: [],
    CANCELLED: [],
  };

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new BadRequestException(
      `Chuyển trạng thái đơn hàng không hợp lệ: ${from} → ${to}`,
    );
  }
}
