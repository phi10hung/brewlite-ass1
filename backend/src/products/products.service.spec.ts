import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

const CA_PHE = 1;
const SUA = 2;
const KEM = 3;
const TRAN_CHAU = 4;

const LATTE = { id: 1, name: 'Latte', price: 49000 };
const CAPPUCCINO = { id: 2, name: 'Cappuccino', price: 45000 };

const RECIPES = [
  { productId: 1, ingredientId: CA_PHE, amount: 18 },
  { productId: 1, ingredientId: SUA, amount: 200 },
  { productId: 2, ingredientId: CA_PHE, amount: 18 },
  { productId: 2, ingredientId: SUA, amount: 150 },
];
const TOPPING_RECIPES = [
  { toppingId: 3, ingredientId: KEM, amount: 30 },
  { toppingId: 4, ingredientId: TRAN_CHAU, amount: 50 },
];
const TOPPINGS = [
  { id: 3, name: 'Kem cheese', price: 8000 },
  { id: 4, name: 'Trân châu', price: 5000 },
];

function setup(stock: Record<number, number> = {}) {
  const ingredientStock = {
    [CA_PHE]: 1000,
    [SUA]: 5000,
    [KEM]: 1000,
    [TRAN_CHAU]: 1000,
    ...stock,
  };
  const prismaMock: any = {
    product: { findMany: jest.fn(), findUnique: jest.fn() },
    topping: { findMany: jest.fn().mockResolvedValue(TOPPINGS) },
    recipe: { findMany: jest.fn().mockResolvedValue(RECIPES) },
    toppingRecipe: { findMany: jest.fn().mockResolvedValue(TOPPING_RECIPES) },
    ingredient: {
      findMany: jest.fn().mockResolvedValue(
        Object.entries(ingredientStock).map(([id, s]) => ({
          id: Number(id),
          stock: s,
        })),
      ),
    },
  };
  const service = new ProductsService(prismaMock as unknown as PrismaService);
  return { service, prismaMock };
}

describe('ProductsService.findAll', () => {
  it('không truyền category thì lấy tất cả', async () => {
    const { service, prismaMock } = setup();
    prismaMock.product.findMany.mockResolvedValue([LATTE]);

    await service.findAll();

    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined, orderBy: { id: 'asc' } }),
    );
  });

  it('lọc theo category', async () => {
    const { service, prismaMock } = setup();
    prismaMock.product.findMany.mockResolvedValue([LATTE]);

    await service.findAll('Cà phê');

    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { category: 'Cà phê' } }),
    );
  });

  it('stock = số ly size S, không topping còn pha được', async () => {
    const { service, prismaMock } = setup();
    prismaMock.product.findMany.mockResolvedValue([LATTE]);

    const [latte] = await service.findAll();

    // Latte S: cà phê ceil(18 x 0,8) = 15g, sữa 160ml -> min(66, 31) = 31
    expect(latte.stock).toBe(31);
  });

  it('các món dùng chung nguyên liệu cùng bị ảnh hưởng khi kho giảm', async () => {
    const { service, prismaMock } = setup();
    prismaMock.product.findMany.mockResolvedValue([LATTE, CAPPUCCINO]);
    const full = await service.findAll();

    const { service: low, prismaMock: lowMock } = setup({ [CA_PHE]: 150 });
    lowMock.product.findMany.mockResolvedValue([LATTE, CAPPUCCINO]);
    const reduced = await low.findAll();

    // Cà phê còn 150g: S dùng 15g -> 10 ly cả hai món
    expect(reduced[0].stock).toBe(10);
    expect(reduced[1].stock).toBe(10);
    expect(full[0].stock).toBeGreaterThan(reduced[0].stock);
  });

  it('hết nguyên liệu thì stock = 0', async () => {
    const { service, prismaMock } = setup({ [SUA]: 0 });
    prismaMock.product.findMany.mockResolvedValue([LATTE]);

    const [latte] = await service.findAll();

    expect(latte.stock).toBe(0);
  });
});

describe('ProductsService.findOne', () => {
  it('trả thông tin món kèm size, topping và stock', async () => {
    const { service, prismaMock } = setup();
    prismaMock.product.findUnique.mockResolvedValue(LATTE);
    prismaMock.recipe.findMany.mockResolvedValue(
      RECIPES.filter((r) => r.productId === 1),
    );

    const result = await service.findOne(1);

    expect(result.name).toBe('Latte');
    expect(result.stock).toBe(31);
    expect(result.sizes).toEqual([
      { size: 'S', extra: 0 },
      { size: 'M', extra: 5000 },
      { size: 'L', extra: 10000 },
    ]);
    expect(result.toppings).toHaveLength(2);
  });

  it('topping hết nguyên liệu thì available = false', async () => {
    // Kem cheese cần 30g nhưng kho chỉ còn 10g
    const { service, prismaMock } = setup({ [KEM]: 10 });
    prismaMock.product.findUnique.mockResolvedValue(LATTE);
    prismaMock.recipe.findMany.mockResolvedValue(
      RECIPES.filter((r) => r.productId === 1),
    );

    const result = await service.findOne(1);

    expect(result.toppings.find((t) => t.id === 3)?.available).toBe(false);
    expect(result.toppings.find((t) => t.id === 4)?.available).toBe(true);
  });

  it('ném 404 khi không có sản phẩm', async () => {
    const { service, prismaMock } = setup();
    prismaMock.product.findUnique.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });
});

describe('ProductsService.availability', () => {
  const addLatte = (size: 'S' | 'M' | 'L') => ({
    productId: 1,
    size,
    toppingIds: [],
  });

  it('giỏ trống: còn thêm được đúng số ly pha được', async () => {
    const { service } = setup();

    // Latte M: min(1000/18 = 55, 5000/200 = 25) = 25
    await expect(
      service.availability({ items: [], add: addLatte('M') }),
    ).resolves.toEqual({ maxQuantity: 25 });
  });

  it('size L tốn nguyên liệu hơn size S', async () => {
    const { service } = setup();

    const s = await service.availability({ items: [], add: addLatte('S') });
    const l = await service.availability({ items: [], add: addLatte('L') });

    expect(s.maxQuantity).toBe(31);
    expect(l.maxQuantity).toBe(19);
  });

  it('trừ nguyên liệu của các món đã có trong giỏ', async () => {
    const { service } = setup();

    // 10 Latte M dùng 180g cà phê, 2000ml sữa -> còn 820g, 3000ml -> min(45, 15) = 15
    const result = await service.availability({
      items: [{ productId: 1, size: 'M', toppingIds: [], quantity: 10 }],
      add: addLatte('M'),
    });

    expect(result.maxQuantity).toBe(15);
  });

  it('món khác trong giỏ dùng chung nguyên liệu cũng làm giảm số ly còn thêm được', async () => {
    const { service } = setup();

    // 20 Cappuccino M dùng 360g cà phê, 3000ml sữa -> còn 640g, 2000ml
    // Latte M: min(floor(640/18) = 35, 2000/200 = 10) = 10
    const result = await service.availability({
      items: [{ productId: 2, size: 'M', toppingIds: [], quantity: 20 }],
      add: addLatte('M'),
    });

    expect(result.maxQuantity).toBe(10);
  });

  it('topping trong món muốn thêm cũng tốn nguyên liệu', async () => {
    // Kem cheese 30g, kho còn 100g -> tối đa 3 ly dù cà phê, sữa còn nhiều
    const { service } = setup({ [KEM]: 100 });

    const result = await service.availability({
      items: [],
      add: { productId: 1, size: 'M', toppingIds: [3], quantity: undefined } as never,
    });

    expect(result.maxQuantity).toBe(3);
  });

  it('giỏ đã dùng quá kho thì còn thêm được 0 ly, không âm', async () => {
    const { service } = setup();

    const result = await service.availability({
      items: [{ productId: 1, size: 'M', toppingIds: [], quantity: 100 }],
      add: addLatte('M'),
    });

    expect(result.maxQuantity).toBe(0);
  });
});