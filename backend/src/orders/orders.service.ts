import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SIZE_EXTRA } from '../common/pricing';
import { CreateOrderDto } from './dto/create-order.dto';

// Bỏ các ký tự dễ nhầm (0/O, 1/I) để khách đọc mã đơn không bị sai
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateOrderCode(): string {
  let suffix = '';
  for (const byte of randomBytes(6)) {
    suffix += CODE_CHARS[byte % CODE_CHARS.length];
  }
  return `BL-${suffix}`;
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateOrderDto) {
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const toppingIds = [...new Set(dto.items.flatMap((i) => i.toppingIds))];

    // Giá luôn lấy từ database, không tin giá client gửi
    const [products, toppings] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, price: true },
      }),
      this.prisma.topping.findMany({
        where: { id: { in: toppingIds } },
        select: { id: true, name: true, price: true },
      }),
    ]);
    const productMap = new Map(products.map((p) => [p.id, p]));
    const toppingMap = new Map(toppings.map((t) => [t.id, t]));

    const lines = dto.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new BadRequestException(`Sản phẩm #${item.productId} không tồn tại`);
      }

      // Set để một topping gửi trùng không bị tính tiền hai lần
      const chosen = [...new Set(item.toppingIds)].map((id) => {
        const topping = toppingMap.get(id);
        if (!topping) {
          throw new BadRequestException(`Topping #${id} không tồn tại`);
        }
        return topping;
      });

      const toppingTotal = chosen.reduce((sum, t) => sum + t.price, 0);
      const unitPrice = product.price + SIZE_EXTRA[item.size] + toppingTotal;

      return {
        productId: product.id,
        productName: product.name,
        size: item.size,
        toppings: chosen.map((t) => t.name),
        quantity: item.quantity,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
      };
    });

    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);

    // Tạo Order và OrderItem trong một lần ghi: nếu một món lỗi thì cả đơn bị huỷ
    return this.prisma.order.create({
      data: {
        code: generateOrderCode(),
        status: 'PENDING',
        subtotal,
        discount: 0,
        total: subtotal,
        userId,
        items: { create: lines },
      },
      select: {
        id: true,
        code: true,
        status: true,
        subtotal: true,
        discount: true,
        total: true,
        items: {
          select: {
            productId: true,
            productName: true,
            size: true,
            toppings: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
          },
        },
      },
    });
  }
    findMine(userId: number) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        code: true,
        status: true,
        total: true,
        createdAt: true,
        items: {
          orderBy: { id: 'asc' },
          select: {
            productName: true,
            size: true,
            toppings: true,
            quantity: true,
            lineTotal: true,
          },
        },
      },
    });
  }

  async findOne(userId: number, id: number) {
    // Lọc luôn theo userId: đơn không tồn tại hoặc của người khác đều ra null
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      select: {
        id: true,
        code: true,
        status: true,
        subtotal: true,
        discount: true,
        total: true,
        promotionCode: true,
        createdAt: true,
        items: {
          orderBy: { id: 'asc' },
          select: {
            productName: true,
            size: true,
            toppings: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
          },
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    return order;
  }
}