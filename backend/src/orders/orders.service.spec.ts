import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { OrdersService, generateOrderCode } from './orders.service';
import { PromotionsService } from '../promotions/promotions.service';
import type { CreateOrderDto } from './dto/create-order.dto';
import { PaymentsService } from '../payments/payments.service';

// Nguyên liệu mẫu
const CA_PHE = 1;
const SUA = 2;
const KEM = 3;

const PRODUCTS = [
  { id: 1, name: 'Latte', price: 49000 },
  { id: 2, name: 'Cappuccino', price: 45000 },
];
const TOPPINGS = [{ id: 3, name: 'Kem cheese', price: 8000 }];
// Công thức cho size M
const RECIPES = [
  { productId: 1, ingredientId: CA_PHE, amount: 18 },
  { productId: 1, ingredientId: SUA, amount: 200 },
  { productId: 2, ingredientId: CA_PHE, amount: 18 },
  { productId: 2, ingredientId: SUA, amount: 150 },
];
const TOPPING_RECIPES = [{ toppingId: 3, ingredientId: KEM, amount: 30 }];

const DEFAULT_STOCK = { [CA_PHE]: 1000, [SUA]: 5000, [KEM]: 1000 };

// Database giả: kho nguyên liệu nằm trong bộ nhớ, updateMany chỉ khớp khi version trùng
function setup(initialStock: Record<number, number> = DEFAULT_STOCK) {
  const ingredients = new Map<number, { stock: number; version: number }>();
  for (const [id, stock] of Object.entries(initialStock)) {
    ingredients.set(Number(id), { stock, version: 0 });
  }

  const promotions = { calculate: jest.fn() };

  const paymentsMock = {
      revokeLoyaltyPoints: jest.fn(),
      refundOrder: jest.fn(),
    };

  const fake: any = {
    product: { findMany: jest.fn().mockResolvedValue(PRODUCTS) },
    topping: { findMany: jest.fn().mockResolvedValue(TOPPINGS) },
    recipe: { findMany: jest.fn().mockResolvedValue(RECIPES) },
    toppingRecipe: { findMany: jest.fn().mockResolvedValue(TOPPING_RECIPES) },
    ingredient: {
      findUnique: jest.fn(async ({ where }) => {
        await Promise.resolve(); // nhường lượt để các đơn đồng thời cùng đọc trước khi ai ghi
        const ing = ingredients.get(where.id);
        return ing ? { ...ing } : null;
      }),
      updateMany: jest.fn(async ({ where, data }) => {
        const ing = ingredients.get(where.id);
        if (!ing || ing.version !== where.version) return { count: 0 };
        ing.stock -= data.stock.decrement;
        ing.version += data.version.increment;
        return { count: 1 };
      }),
    },
    order: {
      create: jest.fn(async () => ({ id: 1 })),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
    },
    // Transaction giả: nếu callback ném lỗi thì hoàn lại các lần trừ kho của chính nó
    $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => {
      const applied: Array<[number, number]> = [];
      const tx = {
        ...fake,
        ingredient: {
          ...fake.ingredient,
          updateMany: async (args: any) => {
            const result = await fake.ingredient.updateMany(args);
            if (result.count) applied.push([args.where.id, args.data.stock.decrement]);
            return result;
          },
        },
      };
      try {
        return await cb(tx);
      } catch (e) {
        for (const [id, amount] of applied) {
          const ing = ingredients.get(id);
          if (ing) ing.stock += amount;
        }
        throw e;
      }
    }),
  };

    const service = new OrdersService(
    fake,
    promotions as unknown as PromotionsService,
    paymentsMock as unknown as PaymentsService,
  );
  return { service, fake, ingredients, promotions, paymentsMock };
}
const makeDto = (
  items: CreateOrderDto['items'],
  promotionCode?: string,
): CreateOrderDto => ({ items, paymentMethod: 'WALLET', promotionCode });

const latteM = (quantity = 1): CreateOrderDto['items'] => [
  { productId: 1, size: 'M', toppingIds: [], quantity },
];

describe('OrdersService', () => {
  it('tính đúng tiền: Latte size L + Kem cheese x2 = 134.000đ', async () => {
    const { service, fake } = setup();

    await service.create(
      7,
      makeDto([{ productId: 1, size: 'L', toppingIds: [3], quantity: 2 }]),
    );

    // (49.000 + 10.000 phụ thu L + 8.000 topping) x 2 = 134.000
    const data = fake.order.create.mock.calls[0][0].data;
    expect(data).toEqual(
      expect.objectContaining({
        subtotal: 134000,
        discount: 0,
        total: 134000,
        promotionCode: null,
        status: 'PENDING',
        paymentMethod: 'WALLET',
        userId: 7,
      }),
    );
  });

  it('trừ nguyên liệu theo món × size + topping và ghi lại lượng đã trừ', async () => {
    const { service, fake, ingredients } = setup();

    await service.create(
      7,
      makeDto([{ productId: 1, size: 'L', toppingIds: [3], quantity: 2 }]),
    );

    // Latte L: cà phê ceil(18 x 1,3) = 24, sữa 260; kem cheese 30 (không nhân size); x 2 ly
    expect(ingredients.get(CA_PHE)?.stock).toBe(1000 - 48);
    expect(ingredients.get(SUA)?.stock).toBe(5000 - 520);
    expect(ingredients.get(KEM)?.stock).toBe(1000 - 60);
    const data = fake.order.create.mock.calls[0][0].data;
    expect(data.ingredients.create).toEqual([
      { ingredientId: CA_PHE, amount: 48 },
      { ingredientId: SUA, amount: 520 },
      { ingredientId: KEM, amount: 60 },
    ]);
  });

  it('lưu hạn thanh toán khoảng 5 phút', async () => {
    const { service, fake } = setup();

    await service.create(7, makeDto(latteM()));

    const data = fake.order.create.mock.calls[0][0].data;
    const minutes = (data.expiresAt.getTime() - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(4.9);
    expect(minutes).toBeLessThanOrEqual(5);
  });

  it('áp mã giảm giá: lưu discount, total và promotionCode', async () => {
    const { service, fake, promotions } = setup();
    fake.product.findMany.mockResolvedValue([
      { id: 1, name: 'Latte', price: 120000 },
    ]);
    fake.topping.findMany.mockResolvedValue([]);
    promotions.calculate.mockResolvedValue({
      code: 'GIAM10',
      discount: 12000,
      total: 108000,
    });

    await service.create(
      7,
      makeDto(
        [{ productId: 1, size: 'S', toppingIds: [], quantity: 1 }],
        'giam10',
      ),
    );

    expect(promotions.calculate).toHaveBeenCalledWith('giam10', 120000);
    expect(fake.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotal: 120000,
          discount: 12000,
          total: 108000,
          promotionCode: 'GIAM10',
        }),
      }),
    );
  });

  it('mã giảm giá sai: báo lỗi và không trừ kho, không tạo đơn', async () => {
    const { service, fake, promotions, ingredients } = setup();
    promotions.calculate.mockRejectedValue(
      new BadRequestException('Mã giảm giá không tồn tại'),
    );

    await expect(
      service.create(
        7,
        makeDto(
          [{ productId: 1, size: 'S', toppingIds: [], quantity: 1 }],
          'KHONGCO',
        ),
      ),
    ).rejects.toThrow(BadRequestException);

    expect(fake.ingredient.updateMany).not.toHaveBeenCalled();
    expect(fake.order.create).not.toHaveBeenCalled();
    expect(ingredients.get(CA_PHE)?.stock).toBe(1000);
  });

  it('báo lỗi khi sản phẩm không tồn tại', async () => {
    const { service, fake } = setup();
    fake.product.findMany.mockResolvedValue([]);
    fake.topping.findMany.mockResolvedValue([]);

    await expect(
      service.create(
        7,
        makeDto([{ productId: 999, size: 'S', toppingIds: [], quantity: 1 }]),
      ),
    ).rejects.toThrow(BadRequestException);
    expect(fake.order.create).not.toHaveBeenCalled();
  });

  it('báo lỗi khi topping không tồn tại', async () => {
    const { service, fake } = setup();
    fake.topping.findMany.mockResolvedValue([]);

    await expect(
      service.create(
        7,
        makeDto([{ productId: 1, size: 'S', toppingIds: [99], quantity: 1 }]),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('thiếu nguyên liệu: báo số ly còn pha được, không trừ gì, không tạo đơn', async () => {
    // Cà phê chỉ còn 100g: Latte M (18g) pha được floor(100/18) = 5 ly
    const { service, fake, ingredients } = setup({
      [CA_PHE]: 100,
      [SUA]: 5000,
      [KEM]: 1000,
    });

    await expect(service.create(7, makeDto(latteM(6)))).rejects.toThrow(
      'Món Latte không đủ nguyên liệu, chỉ còn pha được 5 ly',
    );

    expect(fake.ingredient.updateMany).not.toHaveBeenCalled();
    expect(fake.order.create).not.toHaveBeenCalled();
    expect(ingredients.get(CA_PHE)?.stock).toBe(100);
    expect(ingredients.get(SUA)?.stock).toBe(5000);
  });

  it('món chưa có công thức pha chế thì báo lỗi, không tạo đơn', async () => {
    const { service, fake } = setup();
    fake.recipe.findMany.mockResolvedValue([]);

    await expect(service.create(7, makeDto(latteM()))).rejects.toThrow(
      BadRequestException,
    );
    expect(fake.order.create).not.toHaveBeenCalled();
  });

  it('mã đơn có dạng BL-XXXXXX', () => {
    expect(generateOrderCode()).toMatch(/^BL-[A-Z2-9]{6}$/);
  });

    it('lấy đơn của chính mình, mới nhất trước', async () => {
    const { service, fake } = setup();
    fake.order.findMany.mockResolvedValue([
      { id: 2, payments: [] },
      { id: 1, payments: [{ refundStatus: 'SUCCESS' }] },
    ]);

    const result = await service.findMine(7);

    expect(result).toEqual([
      { id: 2, refundStatus: null },
      { id: 1, refundStatus: 'SUCCESS' },
    ]);
    expect(fake.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 7 },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('xem chi tiết đơn của mình', async () => {
    const { service, fake } = setup();
    fake.order.findFirst.mockResolvedValue({
      id: 5,
      code: 'BL-ABC234',
      payments: [],
    });

    await expect(service.findOne(7, 5)).resolves.toEqual({
      id: 5,
      code: 'BL-ABC234',
      refundStatus: null,
    });
    expect(fake.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5, userId: 7 } }),
    );
  });
  it('đơn của người khác hoặc không tồn tại thì 404', async () => {
    const { service, fake } = setup();
    fake.order.findFirst.mockResolvedValue(null);

    await expect(service.findOne(7, 999)).rejects.toThrow(NotFoundException);
  });
});

describe('OrdersService - đặt đồng thời (test c)', () => {
  it('2 đơn cùng mua món chỉ đủ nguyên liệu cho 1 ly: chỉ 1 đơn thành công, kho không âm', async () => {
    // Cà phê 18g, sữa 200ml: đúng 1 ly Latte M
    const { service, fake, ingredients } = setup({
      [CA_PHE]: 18,
      [SUA]: 200,
      [KEM]: 0,
    });

    const results = await Promise.allSettled([
      service.create(1, makeDto(latteM())),
      service.create(2, makeDto(latteM())),
    ]);

    const ok = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      BadRequestException,
    );
    expect(ingredients.get(CA_PHE)?.stock).toBe(0);
    expect(ingredients.get(SUA)?.stock).toBe(0);
    expect(fake.order.create).toHaveBeenCalledTimes(1);
  });

  it('2 món khác nhau dùng chung nguyên liệu đặt đồng thời: không vượt kho', async () => {
    // Cà phê 20g chỉ đủ 1 ly (18g), dù Latte và Cappuccino là hai món khác nhau
    const { service, ingredients } = setup({
      [CA_PHE]: 20,
      [SUA]: 5000,
      [KEM]: 0,
    });

    const results = await Promise.allSettled([
      service.create(1, makeDto(latteM())),
      service.create(
        2,
        makeDto([{ productId: 2, size: 'M', toppingIds: [], quantity: 1 }]),
      ),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(ingredients.get(CA_PHE)?.stock).toBe(2);
  });

  it('30 đơn đặt cùng lúc: kho nguyên liệu không bao giờ âm và khớp số đơn thành công', async () => {
    // Cà phê 360g = 20 ly Latte M, nhưng có 30 đơn
    const { service, ingredients } = setup({
      [CA_PHE]: 360,
      [SUA]: 5000,
      [KEM]: 0,
    });

    const results = await Promise.allSettled(
      Array.from({ length: 30 }, (_, i) => service.create(i, makeDto(latteM()))),
    );

    const success = results.filter((r) => r.status === 'fulfilled').length;
    const caPhe = ingredients.get(CA_PHE)?.stock ?? -1;
    expect(caPhe).toBeGreaterThanOrEqual(0);
    expect(success).toBeLessThanOrEqual(20);
    expect(caPhe).toBe(360 - 18 * success);
    expect(ingredients.get(SUA)?.stock).toBe(5000 - 200 * success);
  });
});

describe('OrdersService - thử lại khi xung đột version', () => {
  it('xung đột 3 lần rồi thành công: vẫn tạo được đơn', async () => {
    const { service, fake } = setup();
    // 3 lần đầu version đã bị đổi (count 0), sau đó trừ kho thành công
    fake.ingredient.updateMany = jest
      .fn()
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValue({ count: 1 });

    await service.create(1, makeDto(latteM()));

    // 3 lần xung đột (dừng ở cà phê) + lần thành công trừ 2 nguyên liệu (cà phê, sữa)
    expect(fake.ingredient.updateMany).toHaveBeenCalledTimes(5);
    expect(fake.order.create).toHaveBeenCalledTimes(1);
  });

  it('xung đột mãi: báo 409 sau 10 lần thử', async () => {
    const { service, fake } = setup();
    fake.ingredient.updateMany = jest.fn().mockResolvedValue({ count: 0 });

    await expect(service.create(1, makeDto(latteM()))).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(fake.ingredient.updateMany).toHaveBeenCalledTimes(10);
    expect(fake.order.create).not.toHaveBeenCalled();
  });
});

describe('OrdersService - đặt đơn mới hủy đơn chờ cũ', () => {
  it('hủy các đơn chờ thanh toán cũ của khách trước khi tạo đơn mới', async () => {
    const { service, fake } = setup();
    fake.order.findMany.mockResolvedValue([{ id: 11 }, { id: 12 }]);
    const cancel = jest.spyOn(service, 'cancel').mockResolvedValue(null);

    await service.create(7, makeDto(latteM()));

    expect(fake.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 7 }),
      }),
    );
    expect(cancel).toHaveBeenCalledWith(11, 'SYSTEM');
    expect(cancel).toHaveBeenCalledWith(12, 'SYSTEM');
    expect(fake.order.create).toHaveBeenCalledTimes(1);
  });

  it('đơn cũ vừa thanh toán xong (409) thì giữ nguyên, vẫn tạo đơn mới', async () => {
    const { service, fake } = setup();
    fake.order.findMany.mockResolvedValue([{ id: 11 }]);
    jest.spyOn(service, 'cancel').mockRejectedValue(new ConflictException());

    await service.create(7, makeDto(latteM()));

    expect(fake.order.create).toHaveBeenCalledTimes(1);
  });

  it('đơn mới không hợp lệ thì không đụng đơn cũ', async () => {
    const { service, fake } = setup();
    fake.order.findMany.mockResolvedValue([{ id: 11 }]);
    const cancel = jest.spyOn(service, 'cancel').mockResolvedValue(null);
    fake.product.findMany.mockResolvedValue([]); // món không tồn tại

    await expect(service.create(7, makeDto(latteM()))).rejects.toThrow(
      BadRequestException,
    );

    expect(cancel).not.toHaveBeenCalled();
  });
});

describe('OrdersService - hủy đơn', () => {
  type FakeOrder = { id: number; userId: number; status: string };

  // Dựng DB giả: 1 đơn dùng 2 nguyên liệu (id 1: 18g, id 2: 150ml), kho đang còn 100 và 1000
  function setupCancel(order: FakeOrder) {
    const orders = new Map<number, FakeOrder>([[order.id, { ...order }]]);
    const stock = new Map<number, number>([
      [1, 100],
      [2, 1000],
    ]);
    const used = [
      { orderId: order.id, ingredientId: 1, amount: 18 },
      { orderId: order.id, ingredientId: 2, amount: 150 },
    ];

    const tx = {
      order: {
        // Giống code thật: khách chỉ thấy đơn của mình (userId truyền vào where)
        findFirst: jest.fn(
          async ({ where }: { where: { id: number; userId?: number } }) => {
            const o = orders.get(where.id);
            if (!o) return null;
            if (where.userId !== undefined && o.userId !== where.userId) {
              return null;
            }
            return { id: o.id, status: o.status };
          },
        ),
        // Chỉ đổi khi trạng thái còn đúng như lúc đọc, giống khóa lạc quan ở code thật
        updateMany: jest.fn(
          async ({
            where,
            data,
          }: {
            where: { id: number; status: string };
            data: { status: string };
          }) => {
            const o = orders.get(where.id);
            if (!o || o.status !== where.status) return { count: 0 };
            o.status = data.status;
            return { count: 1 };
          },
        ),
        findUnique: jest.fn(async ({ where }: { where: { id: number } }) => {
          const o = orders.get(where.id);
          return o ? { ...o, payments: [] } : null;
        }),
      },
      orderIngredient: {
        findMany: jest.fn(async ({ where }: { where: { orderId: number } }) =>
          used.filter((u) => u.orderId === where.orderId),
        ),
      },
      ingredient: {
        update: jest.fn(
          async ({
            where,
            data,
          }: {
            where: { id: number };
            data: { stock: { increment: number } };
          }) => {
            stock.set(where.id, (stock.get(where.id) ?? 0) + data.stock.increment);
            return {};
          },
        ),
      },
    };

    const prisma = {
      ...tx,
      $transaction: jest.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
    };
    const paymentsMock = {
      revokeLoyaltyPoints: jest.fn().mockResolvedValue(undefined),
      refundOrder: jest.fn().mockResolvedValue(undefined),
    };

    
    const promotionsMock = { calculate: jest.fn() };

    const service = new OrdersService(
      prisma as never,
      promotionsMock as never,
      paymentsMock as never,
    );
    return { service, prisma, orders, stock, paymentsMock };
  }

  it('khách hủy đơn PENDING: nguyên liệu được trả lại đủ', async () => {
    const { service, orders, stock, paymentsMock } = setupCancel({
      id: 1,
      userId: 7,
      status: 'PENDING',
    });

    await service.cancel(1, 'CUSTOMER', 7);

    expect(orders.get(1)?.status).toBe('CANCELLED');
    expect(stock.get(1)).toBe(118);
    expect(stock.get(2)).toBe(1150);
    // Chưa trả tiền thì không có gì để thu hồi hay hoàn
    expect(paymentsMock.revokeLoyaltyPoints).not.toHaveBeenCalled();
    expect(paymentsMock.refundOrder).not.toHaveBeenCalled();
  });

  it('hủy đơn đã PAID: thu hồi điểm tích lũy và gọi hoàn tiền', async () => {
    const { service, stock, paymentsMock } = setupCancel({
      id: 1,
      userId: 7,
      status: 'PAID',
    });

    await service.cancel(1, 'CUSTOMER', 7);

    expect(stock.get(1)).toBe(118);
    expect(paymentsMock.revokeLoyaltyPoints).toHaveBeenCalledTimes(1);
    expect(paymentsMock.refundOrder).toHaveBeenCalledWith(1);
  });

  it('khách hủy đơn của người khác: 404 và kho không đổi', async () => {
    const { service, stock } = setupCancel({
      id: 1,
      userId: 7,
      status: 'PENDING',
    });

    await expect(service.cancel(1, 'CUSTOMER', 99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(stock.get(1)).toBe(100);
  });

  it('đơn đang PREPARING không hủy được: 400 và kho không đổi', async () => {
    const { service, orders, stock } = setupCancel({
      id: 1,
      userId: 7,
      status: 'PREPARING',
    });

    await expect(service.cancel(1, 'CUSTOMER', 7)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(orders.get(1)?.status).toBe('PREPARING');
    expect(stock.get(1)).toBe(100);
  });

  it('trạng thái đổi giữa lúc đọc và lúc ghi: 409 và không trả nguyên liệu', async () => {
    const { service, prisma, stock } = setupCancel({
      id: 1,
      userId: 7,
      status: 'PENDING',
    });
    // Giả lập nhân viên vừa bấm "Nhận đơn": updateMany không khớp dòng nào
    prisma.order.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(service.cancel(1, 'CUSTOMER', 7)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(stock.get(1)).toBe(100);
  });

  it('2 lệnh hủy cùng lúc: chỉ một lệnh thắng, nguyên liệu trả đúng 1 lần', async () => {
    const { service, stock } = setupCancel({
      id: 1,
      userId: 7,
      status: 'PENDING',
    });

    const results = await Promise.allSettled([
      service.cancel(1, 'CUSTOMER', 7),
      service.cancel(1, 'CUSTOMER', 7),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    // Nếu trả 2 lần thì sẽ là 136 và 1300
    expect(stock.get(1)).toBe(118);
    expect(stock.get(2)).toBe(1150);
  });

  it('STAFF và SYSTEM hủy được đơn của bất kỳ ai (không lọc userId)', async () => {
    const staff = setupCancel({ id: 1, userId: 7, status: 'PENDING' });
    await staff.service.cancel(1, 'STAFF');
    expect(staff.prisma.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    );
    expect(staff.stock.get(1)).toBe(118);

    const system = setupCancel({ id: 2, userId: 8, status: 'PAYMENT_FAILED' });
    await system.service.cancel(2, 'SYSTEM');
    expect(system.orders.get(2)?.status).toBe('CANCELLED');
    expect(system.stock.get(2)).toBe(1150);
  });
});