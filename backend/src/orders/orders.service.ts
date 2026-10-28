import { BadRequestException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SIZE_EXTRA } from '../common/pricing';
import { CreateOrderDto } from './dto/create-order.dto';
import { PromotionsService } from '../promotions/promotions.service';
import { groupBy, ingredientsForLine, maxCups, type RecipeLine } from '../common/recipe';
import { OrderStatus, PaymentStatus } from '../generated/prisma/enums';
import type { RefundStatus } from '../generated/prisma/enums';
import { assertTransition } from './order-status';
import { PaymentsService } from '../payments/payments.service';

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

// Số lần thử lại khi version đổi (nhiều đơn đặt cùng lúc)
const MAX_ATTEMPTS = 10;

// Chờ ngẫu nhiên trước khi thử lại để các đơn không đụng nhau ở vòng sau
const waitBeforeRetry = (attempt: number) =>
  new Promise((resolve) => setTimeout(resolve, Math.random() * 20 * attempt));

// Lấy trạng thái hoàn tiền từ lần thanh toán thành công gần nhất của đơn
const SUCCESS_PAYMENT = {
  where: { status: PaymentStatus.SUCCESS },
  orderBy: { createdAt: 'desc' },
  take: 1,
  select: { refundStatus: true },
} as const;

const ORDER_DETAIL_SELECT = {
  id: true,
  code: true,
  status: true,
  subtotal: true,
  discount: true,
  total: true,
  promotionCode: true,
  paymentMethod: true,
  expiresAt: true,
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
  payments: SUCCESS_PAYMENT,
} as const;

// Đổi mảng payments thành 1 trường refundStatus cho frontend dễ dùng
function withRefundStatus<
  T extends { payments: { refundStatus: RefundStatus | null }[] },
>(order: T) {
  const { payments, ...rest } = order;
  return { ...rest, refundStatus: payments[0]?.refundStatus ?? null };
}

export type CancelBy = 'CUSTOMER' | 'STAFF' | 'SYSTEM';

// Hạn thanh toán của đơn, mặc định 5 phút
const paymentMinutes = () => Number(process.env.ORDER_PAYMENT_MINUTES) || 5;


@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotions: PromotionsService,
    private readonly payments: PaymentsService,
  ) {}

    async create(userId: number, dto: CreateOrderDto) {
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const toppingIds = [...new Set(dto.items.flatMap((i) => i.toppingIds))];

    // Giá và công thức luôn lấy từ database, không tin dữ liệu client gửi
    const [products, toppings, recipeRows, toppingRecipeRows] =
      await Promise.all([
        this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, price: true },
        }),
        this.prisma.topping.findMany({
          where: { id: { in: toppingIds } },
          select: { id: true, name: true, price: true },
        }),
        this.prisma.recipe.findMany({
          where: { productId: { in: productIds } },
          select: { productId: true, ingredientId: true, amount: true },
        }),
        this.prisma.toppingRecipe.findMany({
          where: { toppingId: { in: toppingIds } },
          select: { toppingId: true, ingredientId: true, amount: true },
        }),
      ]);
    const productMap = new Map(products.map((p) => [p.id, p]));
    const toppingMap = new Map(toppings.map((t) => [t.id, t]));
    const recipesByProduct = groupBy(recipeRows, (r) => r.productId);
    const recipesByTopping = groupBy(toppingRecipeRows, (r) => r.toppingId);

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

    // Nguyên liệu cần cho `qty` ly của dòng thứ i trong giỏ (món × size + topping)
    const needsOf = (i: number, qty: number) => {
      const item = dto.items[i];
      const toppingRecipes: RecipeLine[][] = [...new Set(item.toppingIds)].map(
        (id) => recipesByTopping.get(id) ?? [],
      );
      return ingredientsForLine(
        recipesByProduct.get(item.productId) ?? [],
        toppingRecipes,
        item.size,
        qty,
      );
    };

    // Cộng dồn nguyên liệu của cả giỏ: ingredientId -> tổng lượng cần
    const needed = new Map<number, number>();
    for (let i = 0; i < lines.length; i++) {
      const perLine = needsOf(i, lines[i].quantity);
      if (perLine.size === 0) {
        throw new BadRequestException(
          `Món ${lines[i].productName} chưa có công thức pha chế`,
        );
      }
      for (const [ingredientId, amount] of perLine) {
        needed.set(ingredientId, (needed.get(ingredientId) ?? 0) + amount);
      }
    }
    // Sắp xếp theo ingredientId để các đơn đồng thời xử lý nguyên liệu cùng thứ tự
    const entries = [...needed.entries()].sort((a, b) => a[0] - b[0]);

    // Tìm dòng giỏ có dùng nguyên liệu này, để báo lỗi đúng tên món
    const lineUsing = (ingredientId: number) => {
      for (let i = 0; i < lines.length; i++) {
        if (needsOf(i, 1).has(ingredientId)) return i;
      }
      return 0;
    };

    const expiresAt = new Date(Date.now() + paymentMinutes() * 60_000);

    for (let attempt = 1; ; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          // 1. Đọc tồn kho + version hiện tại của mọi nguyên liệu cần dùng
          const stock = new Map<number, number>();
          const versions = new Map<number, number>();
          for (const [ingredientId] of entries) {
            const ing = await tx.ingredient.findUnique({
              where: { id: ingredientId },
              select: { stock: true, version: true },
            });
            if (!ing) {
              throw new BadRequestException(
                `Nguyên liệu #${ingredientId} không tồn tại`,
              );
            }
            stock.set(ingredientId, ing.stock);
            versions.set(ingredientId, ing.version);
          }

          // 2. Thiếu nguyên liệu nào thì báo lỗi, chưa trừ gì
          for (const [ingredientId, amount] of entries) {
            if ((stock.get(ingredientId) ?? 0) >= amount) continue;
            const i = lineUsing(ingredientId);
            const cups = maxCups(stock, needsOf(i, 1));
            throw new BadRequestException(
              `Món ${lines[i].productName} không đủ nguyên liệu, chỉ còn pha được ${cups} ly`,
            );
          }

          // 3. Trừ kho chỉ khi version chưa đổi (optimistic locking)
          for (const [ingredientId, amount] of entries) {
            const result = await tx.ingredient.updateMany({
              where: { id: ingredientId, version: versions.get(ingredientId) },
              data: {
                stock: { decrement: amount },
                version: { increment: 1 },
              },
            });
            if (result.count === 0) {
              throw new StockConflictError();
            }
          }

          // 4. Tạo đơn, ghi lại lượng nguyên liệu đã trừ để hủy đơn thì trả đúng
          return tx.order.create({
            data: {
              code: generateOrderCode(),
              status: 'PENDING',
              subtotal,
              discount,
              total,
              promotionCode: promotion?.code ?? null,
              paymentMethod: dto.paymentMethod,
              expiresAt,
              userId,
              items: { create: lines },
              ingredients: {
                create: entries.map(([ingredientId, amount]) => ({
                  ingredientId,
                  amount,
                })),
              },
            },
            select: {
              id: true,
              code: true,
              status: true,
              subtotal: true,
              discount: true,
              total: true,
              promotionCode: true,
              paymentMethod: true,
              expiresAt: true,
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
        // còn lượt thử: chờ ngẫu nhiên rồi vòng for chạy lại, đọc lại stock/version mới
        await waitBeforeRetry(attempt);
      }
    }
  }
    async findMine(userId: number) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        code: true,
        status: true,
        total: true,
        paymentMethod: true,
        expiresAt: true,
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
        payments: SUCCESS_PAYMENT,
      },
    });
    return orders.map(withRefundStatus);
  }

  async findOne(userId: number, id: number) {
    
    // Lọc luôn theo userId: đơn không tồn tại hoặc của người khác đều ra null
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      select: ORDER_DETAIL_SELECT,
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    return withRefundStatus(order);
  }

  

  // Khách hủy, nhân viên hủy (Búp) và tác vụ tự hủy đơn quá hạn (Hùng) đều gọi hàm này
  async cancel(orderId: number, by: CancelBy, userId?: number) {
    const order = await this.prisma.order.findFirst({
      // Khách chỉ được hủy đơn của chính mình; đơn người khác coi như không tồn tại
      where: by === 'CUSTOMER' ? { id: orderId, userId } : { id: orderId },
      select: { id: true, status: true },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    // Chỉ hủy từ PENDING, PAYMENT_FAILED, PAID (sơ đồ 9.1); PREPARING trở đi → 400
    assertTransition(order.status, OrderStatus.CANCELLED);
    const wasPaid = order.status === OrderStatus.PAID;

    await this.prisma.$transaction(async (tx) => {
      // Chỉ đổi khi trạng thái vẫn như lúc đọc: khách hủy đúng lúc nhân viên bấm
      // "Nhận đơn" (hoặc 2 lần hủy cùng lúc) thì chỉ một bên thắng
      const updated = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { status: OrderStatus.CANCELLED },
      });
      if (updated.count === 0) {
        throw new ConflictException(
          'Đơn đã thay đổi trạng thái, vui lòng tải lại',
        );
      }

      // Trả lại đúng lượng nguyên liệu đã trừ khi đặt đơn
      const used = await tx.orderIngredient.findMany({
        where: { orderId: order.id },
        orderBy: { ingredientId: 'asc' },
        select: { ingredientId: true, amount: true },
      });
      for (const u of used) {
        await tx.ingredient.update({
          where: { id: u.ingredientId },
          // Tăng version để các đơn đang đặt dở đọc lại tồn kho mới
          data: { stock: { increment: u.amount }, version: { increment: 1 } },
        });
      }

      if (wasPaid) {
        await this.payments.revokeLoyaltyPoints(tx, order.id);
      }
    });

    // Hoàn tiền gọi VNPay nên để ngoài transaction; lỗi thì Triệu tự ghi "Đang hoàn tiền"
    if (wasPaid) {
      await this.payments.refundOrder(order.id);
    }

    const cancelled = await this.prisma.order.findUnique({
      where: { id: order.id },
      select: ORDER_DETAIL_SELECT,
    });
    return cancelled ? withRefundStatus(cancelled) : null;
  }

}