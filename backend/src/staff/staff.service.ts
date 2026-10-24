import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '../generated/prisma/enums';
import { assertTransition } from '../orders/order-status';
import { PrismaService } from '../prisma/prisma.service';

// Nhân viên chỉ được đưa đơn sang các trạng thái này
const STAFF_TARGETS: readonly OrderStatus[] = [
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
];

const ORDER_INCLUDE = {
  user: { select: { id: true, name: true } },
  items: true,
} as const;

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  // Đơn mới nhất trước, lọc theo trạng thái nếu có
  listOrders(status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: ORDER_INCLUDE,
    });
  }

  async updateStatus(id: number, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    if (!STAFF_TARGETS.includes(status)) {
      throw new BadRequestException(
        'Nhân viên không được chuyển đơn sang trạng thái này',
      );
    }
    assertTransition(order.status, status);
    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: ORDER_INCLUDE,
    });
  }
}