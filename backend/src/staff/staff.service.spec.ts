import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';
import { StaffService } from './staff.service';

describe('StaffService.updateStatus', () => {
  const findUnique = jest.fn();
  const update = jest.fn();
  const findMany = jest.fn();
  let service: StaffService;

  beforeEach(() => {
    jest.resetAllMocks();
    const prisma = {
      order: { findUnique, update, findMany },
    } as unknown as PrismaService;
    service = new StaffService(prisma);
  });

  it('chuyển đúng PAID -> PREPARING thì thành công', async () => {
    findUnique.mockResolvedValue({ id: 1, status: OrderStatus.PAID });
    update.mockResolvedValue({ id: 1, status: OrderStatus.PREPARING });

    const result = await service.updateStatus(1, OrderStatus.PREPARING);

    expect(update).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(OrderStatus.PREPARING);
  });

  it('chuyển sai PAID -> COMPLETED thì bị chặn', async () => {
    findUnique.mockResolvedValue({ id: 1, status: OrderStatus.PAID });

    await expect(
      service.updateStatus(1, OrderStatus.COMPLETED),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });

  it('không tìm thấy đơn thì báo 404', async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      service.updateStatus(999, OrderStatus.PREPARING),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});