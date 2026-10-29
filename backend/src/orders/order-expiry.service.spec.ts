import { ConflictException } from '@nestjs/common';
import { OrderStatus } from '../generated/prisma/enums';
import type { PaymentsService } from '../payments/payments.service';
import type { PrismaService } from '../prisma/prisma.service';
import { OrderExpiryService } from './order-expiry.service';
import type { OrdersService } from './orders.service';

describe('OrderExpiryService', () => {
  const findMany = jest.fn();
  const cancel = jest.fn();
  const syncOrder = jest.fn();
  const retryRefunds = jest.fn();
  let service: OrderExpiryService;

  beforeEach(() => {
    jest.resetAllMocks();
    const prisma = { order: { findMany } } as unknown as PrismaService;
    const orders = { cancel } as unknown as OrdersService;
    const payments = { syncOrder, retryRefunds } as unknown as PaymentsService;
    service = new OrderExpiryService(prisma, orders, payments);
  });

  it('chỉ tìm đơn chờ thanh toán / thanh toán lỗi đã quá hạn', async () => {
    findMany.mockResolvedValue([]);

    await service.cancelExpiredOrders();

    expect(findMany).toHaveBeenCalledWith({
      where: {
        status: { in: [OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED] },
        expiresAt: { lt: expect.any(Date) },
      },
      select: { id: true, code: true },
      orderBy: { id: 'asc' },
    });
  });

  it('đơn quá hạn, VNPay chưa có kết quả: hỏi VNPay rồi hủy (SYSTEM)', async () => {
    findMany.mockResolvedValue([{ id: 1, code: 'BL1' }]);
    syncOrder.mockResolvedValue({ orderStatus: OrderStatus.PENDING });

    const count = await service.cancelExpiredOrders();

    expect(syncOrder).toHaveBeenCalledWith(1);
    expect(cancel).toHaveBeenCalledWith(1, 'SYSTEM');
    expect(count).toBe(1);
  });

  it('VNPay báo khách đã trả xong: không hủy', async () => {
    findMany.mockResolvedValue([{ id: 1, code: 'BL1' }]);
    syncOrder.mockResolvedValue({ orderStatus: OrderStatus.PAID });

    const count = await service.cancelExpiredOrders();

    expect(cancel).not.toHaveBeenCalled();
    expect(count).toBe(0);
  });

  it('không hỏi được VNPay: vẫn hủy đơn', async () => {
    findMany.mockResolvedValue([{ id: 1, code: 'BL1' }]);
    syncOrder.mockRejectedValue(new Error('VNPay lỗi 99'));

    const count = await service.cancelExpiredOrders();

    expect(cancel).toHaveBeenCalledWith(1, 'SYSTEM');
    expect(count).toBe(1);
  });

  it('một đơn hủy lỗi (vừa đổi trạng thái) thì bỏ qua, vẫn hủy các đơn khác', async () => {
    findMany.mockResolvedValue([
      { id: 1, code: 'BL1' },
      { id: 2, code: 'BL2' },
    ]);
    syncOrder.mockResolvedValue({ orderStatus: OrderStatus.PAYMENT_FAILED });
    cancel
      .mockRejectedValueOnce(
        new ConflictException('Đơn đã thay đổi trạng thái'),
      )
      .mockResolvedValueOnce(null);

    const count = await service.cancelExpiredOrders();

    expect(cancel).toHaveBeenCalledTimes(2);
    expect(cancel).toHaveBeenLastCalledWith(2, 'SYSTEM');
    expect(count).toBe(1);
  });

  it('lần chạy trước chưa xong thì lần sau bỏ qua', async () => {
    let finish: (rows: unknown[]) => void = () => undefined;
    findMany.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    const first = service.cancelExpiredOrders();
    const second = await service.cancelExpiredOrders();
    finish([]);
    await first;

    expect(second).toBe(0);
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it('lỗi database không làm sập tác vụ, lần sau vẫn chạy', async () => {
    findMany
      .mockRejectedValueOnce(new Error('mất kết nối'))
      .mockResolvedValueOnce([]);

    await expect(service.cancelExpiredOrders()).resolves.toBe(0);
    await expect(service.cancelExpiredOrders()).resolves.toBe(0);
    expect(findMany).toHaveBeenCalledTimes(2);
  });

  it('thử lại hoàn tiền: gọi retryRefunds của thanh toán', async () => {
    retryRefunds.mockResolvedValue(undefined);

    await service.retryRefunds();

    expect(retryRefunds).toHaveBeenCalledTimes(1);
  });
});
