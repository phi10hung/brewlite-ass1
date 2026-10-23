import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductsService', () => {
  let service: ProductsService;

  const prismaMock = {
    product: { findMany: jest.fn(), findUnique: jest.fn() },
    topping: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = moduleRef.get(ProductsService);
  });

  it('trả về danh sách sản phẩm', async () => {
    const list = [{ id: 1, name: 'Latte', price: 45000 }];
    prismaMock.product.findMany.mockResolvedValue(list);

    await expect(service.findAll()).resolves.toEqual(list);
    expect(prismaMock.product.findMany).toHaveBeenCalledTimes(1);
  });

  it('trả về chi tiết kèm sizes và toppings', async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: 1,
      name: 'Latte',
      price: 45000,
    });
    prismaMock.topping.findMany.mockResolvedValue([
      { id: 1, name: 'Kem cheese', price: 10000 },
    ]);

    const result = await service.findOne(1);

    expect(result.sizes).toEqual([
      { size: 'S', extra: 0 },
      { size: 'M', extra: 5000 },
      { size: 'L', extra: 10000 },
    ]);
    expect(result.toppings).toHaveLength(1);
  });

  it('ném 404 khi không có sản phẩm', async () => {
    prismaMock.product.findUnique.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });
});