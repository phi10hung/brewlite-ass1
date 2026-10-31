import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '../generated/prisma/enums';
import type { OrdersService } from '../orders/orders.service';
import type { PrismaService } from '../prisma/prisma.service';
import { StaffService } from './staff.service';

describe('StaffService.updateStatus', () => {
  const findUnique = jest.fn();
  const findUniqueOrThrow = jest.fn();
  const updateMany = jest.fn();
  const findMany = jest.fn();
  const cancel = jest.fn();
  let service: StaffService;

  beforeEach(() => {
    jest.resetAllMocks();
    const prisma = {
      order: { findUnique, findUniqueOrThrow, updateMany, findMany },
    } as unknown as PrismaService;
    const ordersService = { cancel } as unknown as OrdersService;
    service = new StaffService(prisma, ordersService);
  });

  it('chuyển đúng PAID -> PREPARING thì thành công', async () => {
    findUnique.mockResolvedValue({ id: 1, status: OrderStatus.PAID });
    updateMany.mockResolvedValue({ count: 1 });
    findUniqueOrThrow.mockResolvedValue({
      id: 1,
      status: OrderStatus.PREPARING,
    });

    const result = await service.updateStatus(1, OrderStatus.PREPARING);

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: OrderStatus.PAID },
      data: { status: OrderStatus.PREPARING },
    });
    expect(result.status).toBe(OrderStatus.PREPARING);
  });

  it('chuyển sai PAID -> COMPLETED thì bị chặn', async () => {
    findUnique.mockResolvedValue({ id: 1, status: OrderStatus.PAID });

    await expect(
      service.updateStatus(1, OrderStatus.COMPLETED),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('không tìm thấy đơn thì báo 404', async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      service.updateStatus(999, OrderStatus.PREPARING),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('bấm trùng (đơn vừa đổi trạng thái) thì báo 409, không chạy 2 lần', async () => {
    findUnique.mockResolvedValue({ id: 1, status: OrderStatus.PAID });
    updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.updateStatus(1, OrderStatus.PREPARING),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('hủy đơn PAID thì gọi ordersService.cancel(id, "STAFF")', async () => {
    findUnique.mockResolvedValue({ id: 1, status: OrderStatus.PAID });
    cancel.mockResolvedValue(undefined);
    findUniqueOrThrow.mockResolvedValue({
      id: 1,
      status: OrderStatus.CANCELLED,
    });

    const result = await service.updateStatus(1, OrderStatus.CANCELLED);

    expect(cancel).toHaveBeenCalledWith(1, 'STAFF');
    expect(updateMany).not.toHaveBeenCalled();
    expect(result.status).toBe(OrderStatus.CANCELLED);
  });

  it('hủy đơn không phải PAID (đã nhận pha) thì báo 400, không gọi cancel', async () => {
    findUnique.mockResolvedValue({ id: 1, status: OrderStatus.PREPARING });

    await expect(
      service.updateStatus(1, OrderStatus.CANCELLED),
    ).rejects.toThrow('Đơn đã nhận pha, không hủy được nữa');
    expect(cancel).not.toHaveBeenCalled();
  });

  it('hủy đơn chưa thanh toán thì báo chỉ hủy được đơn đã thanh toán', async () => {
    findUnique.mockResolvedValue({ id: 1, status: OrderStatus.PENDING });

    await expect(
      service.updateStatus(1, OrderStatus.CANCELLED),
    ).rejects.toThrow('Chỉ hủy được đơn đã thanh toán');
    expect(cancel).not.toHaveBeenCalled();
  });
});
describe('StaffService.listIngredients', () => {
  it('trả id, tên, đơn vị, tồn kho và sắp theo tên', async () => {
    const rows = [
      { id: 1, name: 'Cà phê', unit: 'g', stock: 0 },
      { id: 2, name: 'Sữa', unit: 'ml', stock: 5000 },
    ];
    const ingredientFindMany = jest.fn().mockResolvedValue(rows);
    const prisma = {
      ingredient: { findMany: ingredientFindMany },
    } as unknown as PrismaService;
    const service = new StaffService(prisma, {} as unknown as OrdersService);

    const result = await service.listIngredients();

    expect(ingredientFindMany).toHaveBeenCalledWith({
      select: { id: true, name: true, unit: true, stock: true },
      orderBy: { name: 'asc' },
    });
    expect(result).toEqual(rows);
  });
});

describe('StaffService.restockIngredient', () => {
  const findUnique = jest.fn();
  const update = jest.fn();
  let service: StaffService;

  beforeEach(() => {
    jest.resetAllMocks();
    const prisma = {
      ingredient: { findUnique, update },
    } as unknown as PrismaService;
    service = new StaffService(prisma, {} as unknown as OrdersService);
  });

  it('cộng thêm vào kho và tăng version', async () => {
    const row = { id: 3, name: 'Sữa tươi', unit: 'ml', stock: 9400 };
    findUnique.mockResolvedValue({ id: 3 });
    update.mockResolvedValue(row);

    const result = await service.restockIngredient(3, 2000);

    expect(update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { stock: { increment: 2000 }, version: { increment: 1 } },
      select: { id: true, name: true, unit: true, stock: true },
    });
    expect(result).toEqual(row);
  });

  it('không tìm thấy nguyên liệu thì báo 404, không cộng kho', async () => {
    findUnique.mockResolvedValue(null);

    await expect(service.restockIngredient(999, 100)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(update).not.toHaveBeenCalled();
  });
});
