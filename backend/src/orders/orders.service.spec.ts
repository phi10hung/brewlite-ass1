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