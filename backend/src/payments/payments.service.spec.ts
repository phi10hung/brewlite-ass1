import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';

type PaymentRow = {
  id: number;
  orderId: number;
  method: 'WALLET' | 'CARD';
  status: 'SUCCESS' | 'FAILED';
  amount: number;
  createdAt: Date;
};

const createdAt = new Date('2026-10-23T00:00:00.000Z');

const prismaMock = {
  order: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
  payment: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  user: {
    update: jest.fn(),
  },
  loyaltyTransaction: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

function payment(overrides: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: 1,
    orderId: 10,
    method: 'WALLET',
    status: 'SUCCESS',
    amount: 50000,
    createdAt,
    ...overrides,
  };
}

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(
      (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock),
    );
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.loyaltyTransaction.create.mockResolvedValue({});

    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = moduleRef.get(PaymentsService);
  });

  function mockOrder(
    status: 'PENDING' | 'PAYMENT_FAILED' | 'PAID' = 'PENDING',
  ) {
    prismaMock.order.findFirst.mockResolvedValue({
      id: 10,
      status,
      total: 50000,
    });
  }

  it('thanh toán thành công: lưu SUCCESS và chuyển PENDING -> PAID', async () => {
    mockOrder('PENDING');
    prismaMock.payment.findUnique.mockResolvedValue(null);
    prismaMock.payment.create.mockResolvedValue(payment());
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.create(7, 'key-success', {
      orderId: 10,
      method: 'WALLET',
    });

    expect(prismaMock.payment.create).toHaveBeenCalledWith({
      data: {
        orderId: 10,
        method: 'WALLET',
        status: 'SUCCESS',
        amount: 50000,
        idempotencyKey: 'key-success',
      },
      select: expect.anything(),
    });
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
      where: { id: 10, status: 'PENDING' },
      data: { status: 'PAID' },
    });
    expect(result).toEqual(payment());
  });

  it('giả lập lỗi: lưu FAILED và chuyển PENDING -> PAYMENT_FAILED', async () => {
    mockOrder('PENDING');
    prismaMock.payment.findUnique.mockResolvedValue(null);
    prismaMock.payment.create.mockResolvedValue(payment({ status: 'FAILED' }));
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });

    await service.create(7, 'key-fail', {
      orderId: 10,
      method: 'CARD',
      simulate: 'fail',
    });

    expect(prismaMock.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          method: 'CARD',
          status: 'FAILED',
        }),
      }),
    );
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
      where: { id: 10, status: 'PENDING' },
      data: { status: 'PAYMENT_FAILED' },
    });
  });

  it('cùng key trả lại Payment cũ, không tạo hoặc cập nhật thêm', async () => {
    mockOrder('PAID');
    const existing = payment();
    prismaMock.payment.findUnique.mockResolvedValue(existing);

    const result = await service.create(7, 'key-success', {
      orderId: 10,
      method: 'WALLET',
    });

    expect(result).toEqual(existing);
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
  });

  it('cùng key nhưng khác phương thức: báo Conflict', async () => {
    mockOrder();
    prismaMock.payment.findUnique.mockResolvedValue(
      payment({ method: 'WALLET' }),
    );

    await expect(
      service.create(7, 'key-success', { orderId: 10, method: 'CARD' }),
    ).rejects.toThrow(ConflictException);
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it('cùng key nhưng khác đơn: báo Conflict', async () => {
    mockOrder();
    prismaMock.payment.findUnique.mockResolvedValue(payment({ orderId: 99 }));

    await expect(
      service.create(7, 'key-success', { orderId: 10, method: 'WALLET' }),
    ).rejects.toThrow(ConflictException);
  });

  it('thiếu Idempotency-Key: báo BadRequest', async () => {
    await expect(
      service.create(7, undefined, { orderId: 10, method: 'WALLET' }),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.order.findFirst).not.toHaveBeenCalled();
  });

  it('không tìm thấy đơn của user: báo NotFound', async () => {
    prismaMock.order.findFirst.mockResolvedValue(null);

    await expect(
      service.create(7, 'key-success', { orderId: 10, method: 'WALLET' }),
    ).rejects.toThrow(NotFoundException);
    expect(prismaMock.payment.findUnique).not.toHaveBeenCalled();
  });

  it('đơn đã PAID: không cho thanh toán lại', async () => {
    mockOrder('PAID');
    prismaMock.payment.findUnique.mockResolvedValue(null);

    await expect(
      service.create(7, 'key-success', { orderId: 10, method: 'WALLET' }),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it('đơn PAYMENT_FAILED được thanh toán lại: PAYMENT_FAILED -> PENDING -> PAID', async () => {
    mockOrder('PAYMENT_FAILED');
    prismaMock.payment.findUnique.mockResolvedValue(null);
    prismaMock.payment.create.mockResolvedValue(payment({ id: 2 }));
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });

    await service.create(7, 'key-retry', { orderId: 10, method: 'WALLET' });

    expect(prismaMock.order.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 10, status: 'PAYMENT_FAILED' },
      data: { status: 'PENDING' },
    });
    expect(prismaMock.order.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 10, status: 'PENDING' },
      data: { status: 'PAID' },
    });
  });

  it('đơn PAYMENT_FAILED thử lại và vẫn lỗi: PAYMENT_FAILED -> PENDING -> PAYMENT_FAILED', async () => {
    mockOrder('PAYMENT_FAILED');
    prismaMock.payment.findUnique.mockResolvedValue(null);
    prismaMock.payment.create.mockResolvedValue(
      payment({ id: 3, status: 'FAILED' }),
    );
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });

    await service.create(7, 'key-retry-fail', {
      orderId: 10,
      method: 'CARD',
      simulate: 'fail',
    });

    expect(prismaMock.order.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 10, status: 'PAYMENT_FAILED' },
      data: { status: 'PENDING' },
    });
    expect(prismaMock.order.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 10, status: 'PENDING' },
      data: { status: 'PAYMENT_FAILED' },
    });
  });

  it('hai request đồng thời cùng key: request thua đọc lại Payment đã có', async () => {
    mockOrder();
    const existing = payment();
    prismaMock.payment.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing);
    prismaMock.payment.create.mockRejectedValue({ code: 'P2002' });

    const result = await service.create(7, 'key-race', {
      orderId: 10,
      method: 'WALLET',
    });

    expect(result).toEqual(existing);
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
  });

  it('request thua nhưng payload khác: báo Conflict', async () => {
    mockOrder();
    prismaMock.payment.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(payment({ method: 'CARD' }));
    prismaMock.payment.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create(7, 'key-race', { orderId: 10, method: 'WALLET' }),
    ).rejects.toThrow(ConflictException);
  });

  it('đơn bị request khác xử lý trước: báo Conflict', async () => {
    mockOrder();
    prismaMock.payment.findUnique.mockResolvedValue(null);
    prismaMock.payment.create.mockResolvedValue(payment());
    prismaMock.order.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.create(7, 'key-success', { orderId: 10, method: 'WALLET' }),
    ).rejects.toThrow(ConflictException);
  });
});
