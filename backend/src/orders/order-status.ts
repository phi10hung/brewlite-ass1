import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../generated/prisma/enums';

// Luồng chính: PENDING -> PAID -> PREPARING -> READY -> COMPLETED.
// Ngoại lệ: PAYMENT_FAILED quay lại PENDING để thử lại; được hủy từ PENDING,
// PAYMENT_FAILED, PAID (barista chưa nhận). Đã PREPARING, READY thì không hủy.
const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> =
  {
    PENDING: [
      OrderStatus.PAID,
      OrderStatus.PAYMENT_FAILED,
      OrderStatus.CANCELLED,
    ],
    PAYMENT_FAILED: [OrderStatus.PENDING, OrderStatus.CANCELLED],
    PAID: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    PREPARING: [OrderStatus.READY],
    READY: [OrderStatus.COMPLETED],
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
