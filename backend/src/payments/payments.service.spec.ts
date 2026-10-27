import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';
import { VnpayClient } from './vnpay.client';

type PaymentRow = {
  id: number;
  orderId: number;
  method: 'WALLET' | 'CARD';
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  amount: number;
  payUrl: string | null;
  createdAt: Date;
};

const createdAt = new Date('2026-10-27T00:00:00.000Z');
const future = new Date('2099-01-01T00:00:00.000Z');

const prismaMock = {
  order: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
  payment: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

const vnpayMock = {
  buildPayUrl: jest.fn(),
  queryTransaction: jest.fn(),
  refund: jest.fn(),
};

const configMock = {
  get: jest.fn((key: string) =>
    key === 'ORDER_PAYMENT_MINUTES' ? '5' : undefined,
  ),
};

function payment(overrides: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: 1,
    orderId: 10,
    method: 'WALLET',
    status: 'PENDING',
    amount: 50000,
    payUrl: 'https://vnpay.test/pay',
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
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.payment.findUnique.mockResolvedValue(null);
    vnpayMock.buildPayUrl.mockReturnValue('https://vnpay.test/pay');

    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: VnpayClient, useValue: vnpayMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = moduleRef.get(PaymentsService);
  });

  function mockOrder(
    status: 'PENDING' | 'PAYMENT_FAILED' | 'PAID' = 'PENDING',
    total = 50000,
    expiresAt: Date | null = future,
  ) {
    prismaMock.order.findFirst.mockResolvedValue({
      id: 10,
      code: 'BL-7K2M9Q',
      status,
      total,
      expiresAt,
    });
  }

  it('tạo link VNPay: lưu Payment PENDING và trả payUrl', async () => {
    mockOrder();
    prismaMock.payment.create.mockResolvedValue(payment());

    const result = await service.create(
      7,
      'key-success',
      { orderId: 10, method: 'WALLET' },
      '127.0.0.1',
    );

    expect(prismaMock.payment.create).toHaveBeenCalledWith({
      data: {
        orderId: 10,
        method: 'WALLET',
        status: 'PENDING',
        amount: 50000,
        idempotencyKey: 'key-success',
        txnRef: expect.stringMatching(/^BL7K2M9Q[A-Z0-9]{6}$/),
        payUrl: 'https://vnpay.test/pay',
      },
      select: expect.anything(),
    });
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
      where: { id: 10, status: 'PENDING' },
      data: {
        paymentMethod: 'WALLET',
        expiresAt: future,
      },
    });
    expect(vnpayMock.buildPayUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 50000,
        orderInfo: 'Thanh toan don BL-7K2M9Q',
        ipAddr: '127.0.0.1',
        expiresAt: future,
      }),
    );
    expect(vnpayMock.buildPayUrl.mock.calls[0][0].bankCode).toBeUndefined();
    expect(result).toEqual(payment());
  });

  it('CARD gửi bankCode VNBANK', async () => {
    mockOrder();
    prismaMock.payment.create.mockResolvedValue(
      payment({ method: 'CARD' }),
    );

    await service.create(
      7,
      'key-card',
      { orderId: 10, method: 'CARD' },
      '127.0.0.1',
    );

    expect(vnpayMock.buildPayUrl).toHaveBeenCalledWith(
      expect.objectContaining({ bankCode: 'VNBANK' }),
    );
  });

  it('đơn quá hạn: không tạo Payment', async () => {
    mockOrder('PENDING', 50000, new Date('2000-01-01T00:00:00.000Z'));

    await expect(
      service.create(7, 'key-expired', {
        orderId: 10,
        method: 'WALLET',
      }),
    ).rejects.toThrow('Đơn đã hết thời gian thanh toán');

    expect(prismaMock.payment.create).not.toHaveBeenCalled();
    expect(vnpayMock.buildPayUrl).not.toHaveBeenCalled();
  });

  it('đơn chưa có hạn: dùng ORDER_PAYMENT_MINUTES', async () => {
    mockOrder('PENDING', 50000, null);
    prismaMock.payment.create.mockResolvedValue(payment());

    const before = Date.now();
    await service.create(7, 'key-new-expiry', {
      orderId: 10,
      method: 'WALLET',
    });
    const after = Date.now();

    const update = prismaMock.order.updateMany.mock.calls[0][0] as {
      data: { expiresAt: Date };
    };
    expect(update.data.expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + 5 * 60_000,
    );
    expect(update.data.expiresAt.getTime()).toBeLessThanOrEqual(
      after + 5 * 60_000,
    );
  });

  it('đơn PAYMENT_FAILED: chuyển về PENDING rồi tạo link mới', async () => {
    mockOrder('PAYMENT_FAILED');
    prismaMock.payment.create.mockResolvedValue(payment({ id: 2 }));

    await service.create(7, 'key-retry', {
      orderId: 10,
      method: 'WALLET',
    });

    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
      where: { id: 10, status: 'PAYMENT_FAILED' },
      data: {
        status: 'PENDING',
        paymentMethod: 'WALLET',
        expiresAt: future,
      },
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
    expect(vnpayMock.buildPayUrl).not.toHaveBeenCalled();
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

  it('đơn đã PAID: không cho tạo link thanh toán', async () => {
    mockOrder('PAID');

    await expect(
      service.create(7, 'key-success', { orderId: 10, method: 'WALLET' }),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
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
    prismaMock.payment.create.mockResolvedValue(payment());
    prismaMock.order.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.create(7, 'key-success', { orderId: 10, method: 'WALLET' }),
    ).rejects.toThrow(ConflictException);
  });

  it('trùng txnRef: sinh lại mã và tạo Payment', async () => {
    mockOrder();
    prismaMock.payment.create
      .mockRejectedValueOnce({ code: 'P2002', meta: { target: ['txnRef'] } })
      .mockResolvedValueOnce(payment());

    const result = await service.create(7, 'key-txn-ref', {
      orderId: 10,
      method: 'WALLET',
    });

    expect(prismaMock.payment.create).toHaveBeenCalledTimes(2);
    expect(result).toEqual(payment());
  });

  it('trùng txnRef quá số lần: báo Conflict', async () => {
    mockOrder();
    prismaMock.payment.create.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['txnRef'] },
    });

    await expect(
      service.create(7, 'key-txn-ref', { orderId: 10, method: 'WALLET' }),
    ).rejects.toThrow('Không thể tạo mã giao dịch VNPay');
    expect(prismaMock.payment.create).toHaveBeenCalledTimes(3);
  });
});
