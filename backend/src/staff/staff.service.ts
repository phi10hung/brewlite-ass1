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

// Đơn đã qua bước Nhận đơn thì không hủy được nữa
const AFTER_ACCEPTED: readonly OrderStatus[] = [
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.COMPLETED,
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
  // Kho nguyên liệu cho nhân viên xem, sắp theo tên
  listIngredients() {
    return this.prisma.ingredient.findMany({
      select: { id: true, name: true, unit: true, stock: true },
      orderBy: { name: 'asc' },
    });
  }
  
  // Nhập kho: chỉ cộng thêm. Tăng version để các đơn đang đặt dở đọc lại tồn kho mới
  async restockIngredient(id: number, amount: number) {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!ingredient) {
      throw new NotFoundException('Không tìm thấy nguyên liệu');
    }
    return this.prisma.ingredient.update({
      where: { id },
      data: { stock: { increment: amount }, version: { increment: 1 } },
      select: { id: true, name: true, unit: true, stock: true },
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
        throw new BadRequestException(
          AFTER_ACCEPTED.includes(order.status)
            ? 'Đơn đã nhận pha, không hủy được nữa'
            : 'Chỉ hủy được đơn đã thanh toán',
        );
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