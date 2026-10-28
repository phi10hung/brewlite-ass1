import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '../generated/prisma/enums';
import { OrdersService } from '../orders/orders.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

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

    // Hủy: chỉ đơn Đã thanh toán, đi qua hàm hủy chung (trả nguyên liệu, trừ điểm, hoàn tiền)
    if (status === OrderStatus.CANCELLED) {
      if (order.status !== OrderStatus.PAID) {
        throw new BadRequestException('Chỉ hủy được đơn đã thanh toán');
      }
      await this.ordersService.cancel(id, 'STAFF');
      return this.prisma.order.findUniqueOrThrow({
        where: { id },
        include: ORDER_INCLUDE,
      });
    }

    assertTransition(order.status, status);
    // Chỉ đổi khi trạng thái vẫn như lúc đọc, bấm trùng thì count = 0
    const result = await this.prisma.order.updateMany({
      where: { id, status: order.status },
      data: { status },
    });
    if (result.count === 0) {
      throw new ConflictException('Đơn vừa đổi trạng thái, vui lòng tải lại');
    }
    return this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: ORDER_INCLUDE,
    });
  }
}