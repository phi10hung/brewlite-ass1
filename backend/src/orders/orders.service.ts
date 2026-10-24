import { BadRequestException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SIZE_EXTRA } from '../common/pricing';
import { CreateOrderDto } from './dto/create-order.dto';
import { PromotionsService } from '../promotions/promotions.service';

// Bỏ các ký tự dễ nhầm (0/O, 1/I) để khách đọc mã đơn không bị sai
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateOrderCode(): string {
  let suffix = '';
  for (const byte of randomBytes(6)) {
    suffix += CODE_CHARS[byte % CODE_CHARS.length];
  }
  return `BL-${suffix}`;
}

// Báo hiệu "version đã đổi, cần thử lại" (chỉ dùng nội bộ trong file này)
class StockConflictError extends Error {}

const MAX_ATTEMPTS = 3;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotions: PromotionsService,
  ) {}

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

    // Mã sai phải báo lỗi trước khi trừ kho hoặc tạo đơn.
    const promotion = dto.promotionCode
      ? await this.promotions.calculate(dto.promotionCode, subtotal)
      : null;
    const discount = promotion?.discount ?? 0;
    const total = subtotal - discount;

    // Tạo Order và OrderItem trong một lần ghi: nếu một món lỗi thì cả đơn bị huỷ
    
    // Gộp số lượng theo món: giỏ có thể có cùng 1 món ở nhiều dòng (khác size/topping)
    const needed = new Map<number, { name: string; qty: number }>();
    for (const line of lines) {
      const cur = needed.get(line.productId);
      needed.set(line.productId, {
        name: line.productName,
        qty: (cur?.qty ?? 0) + line.quantity,
      });
    }

        // Sắp xếp theo productId để các đơn đồng thời khoá món theo cùng thứ tự
    const entries = [...needed.entries()].sort((a, b) => a[0] - b[0]);

    for (let attempt = 1; ; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          for (const [productId, { name, qty }] of entries) {
            // 1. Đọc tồn kho + version hiện tại
            const p = await tx.product.findUnique({
              where: { id: productId },
              select: { stock: true, version: true },
            });
            if (!p || p.stock < qty) {
              throw new BadRequestException(
                `Món ${name} chỉ còn ${p?.stock ?? 0} ly`,
              );
            }

            // 2. Trừ kho chỉ khi version chưa đổi (optimistic locking)
            const result = await tx.product.updateMany({
              where: { id: productId, version: p.version },
              data: { stock: { decrement: qty }, version: { increment: 1 } },
            });
            if (result.count === 0) {
              throw new StockConflictError();
            }
          }

          return tx.order.create({
            data: {
              code: generateOrderCode(),
              status: 'PENDING',
              subtotal,
              discount,
              total,
              promotionCode: promotion?.code ?? null,
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
              promotionCode: true,
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
        });
      } catch (e) {
        if (!(e instanceof StockConflictError)) throw e;
        if (attempt >= MAX_ATTEMPTS) {
          throw new ConflictException(
            'Hệ thống đang bận, vui lòng đặt lại sau giây lát',
          );
        }
        // còn lượt thử: vòng for chạy lại, đọc lại stock/version mới
      }
    }
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