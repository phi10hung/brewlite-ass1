import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService, generateOrderCode } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OrdersService', () => {
  let service: OrdersService;

  const prismaMock: any = {
  product: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  topping: { findMany: jest.fn() },
  order: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
  $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prismaMock)),
};

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.product.findUnique.mockResolvedValue({ stock: 100, version: 0 });
    prismaMock.product.updateMany.mockResolvedValue({ count: 1 });
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = moduleRef.get(OrdersService);
  });
  
  it('tính đúng tiền: Latte size L + Kem cheese x2 = 134.000đ', async () => {
    prismaMock.product.findMany.mockResolvedValue([
      { id: 1, name: 'Latte', price: 49000 },
    ]);
    prismaMock.topping.findMany.mockResolvedValue([
      { id: 3, name: 'Kem cheese', price: 8000 },
    ]);
    prismaMock.order.create.mockResolvedValue({ id: 1 });

    await service.create(7, {
      items: [{ productId: 1, size: 'L', toppingIds: [3], quantity: 2 }],
    });

    // (49.000 + 10.000 phụ thu L + 8.000 topping) x 2 = 134.000
    expect(prismaMock.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotal: 134000,
          total: 134000,
          status: 'PENDING',
          userId: 7,
        }),
      }),
    );
  });

  it('báo lỗi khi sản phẩm không tồn tại', async () => {
    prismaMock.product.findMany.mockResolvedValue([]);
    prismaMock.topping.findMany.mockResolvedValue([]);

    await expect(
      service.create(7, {
        items: [{ productId: 999, size: 'S', toppingIds: [], quantity: 1 }],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });

  it('báo lỗi khi topping không tồn tại', async () => {
    prismaMock.product.findMany.mockResolvedValue([
      { id: 1, name: 'Latte', price: 49000 },
    ]);
    prismaMock.topping.findMany.mockResolvedValue([]);

    await expect(
      service.create(7, {
        items: [{ productId: 1, size: 'S', toppingIds: [99], quantity: 1 }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('mã đơn có dạng BL-XXXXXX', () => {
    expect(generateOrderCode()).toMatch(/^BL-[A-Z2-9]{6}$/);
  });

    it('lấy đơn của chính mình, mới nhất trước', async () => {
    prismaMock.order.findMany.mockResolvedValue([{ id: 2 }, { id: 1 }]);

    const result = await service.findMine(7);

    expect(result).toEqual([{ id: 2 }, { id: 1 }]);
    expect(prismaMock.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 7 },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('xem chi tiết đơn của mình', async () => {
    prismaMock.order.findFirst.mockResolvedValue({ id: 5, code: 'BL-ABC234' });

    await expect(service.findOne(7, 5)).resolves.toEqual({
      id: 5,
      code: 'BL-ABC234',
    });
    expect(prismaMock.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5, userId: 7 } }),
    );
  });

  it('đơn của người khác hoặc không tồn tại thì 404', async () => {
    prismaMock.order.findFirst.mockResolvedValue(null);

    await expect(service.findOne(7, 999)).rejects.toThrow(NotFoundException);
  });
});