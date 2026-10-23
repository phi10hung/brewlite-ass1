import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrdersService, generateOrderCode } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OrdersService', () => {
  let service: OrdersService;

  const prismaMock = {
    product: { findMany: jest.fn() },
    topping: { findMany: jest.fn() },
    order: { create: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
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
});