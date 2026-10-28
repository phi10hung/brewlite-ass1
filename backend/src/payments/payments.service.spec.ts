import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { Prisma } from '../generated/prisma/client';
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
  txnRef: string | null;
  transactionNo: string | null;
  payDate: string | null;
  refundStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | null;
  createdAt: Date;
};

const createdAt = new Date('2026-10-27T00:00:00.000Z');
const future = new Date('2099-01-01T00:00:00.000Z');

const prismaMock = {
  order: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
  payment: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  loyaltyTransaction: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

const vnpayMock = {
  buildPayUrl: jest.fn(),
  verifyReturn: jest.fn(),
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
    txnRef: 'BL7K2M9QX4P2AB',
    transactionNo: null,
    payDate: null,
    refundStatus: null,
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
    prismaMock.order.findUnique.mockResolvedValue(null);
    prismaMock.payment.findUnique.mockResolvedValue(null);
    prismaMock.payment.findMany.mockResolvedValue([]);
    prismaMock.payment.update.mockResolvedValue({});
    prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.loyaltyTransaction.findUnique.mockResolvedValue(null);
    prismaMock.loyaltyTransaction.create.mockResolvedValue({});
    prismaMock.user.findUnique.mockResolvedValue({ loyaltyPoints: 10 });
    prismaMock.user.update.mockResolvedValue({});
    vnpayMock.buildPayUrl.mockReturnValue('https://vnpay.test/pay');
    vnpayMock.verifyReturn.mockReturnValue(true);
    vnpayMock.queryTransaction.mockResolvedValue({
      responseCode: '00',
      transactionStatus: '00',
      transactionNo: 'VNP123',
      payDate: '20261027230000',
      message: 'ok',
      raw: {},
    });
    vnpayMock.refund.mockResolvedValue({
      responseCode: '00',
      message: 'ok',
      raw: {},
    });

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
        createdAt: expect.any(Date),
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

    const createArgs = prismaMock.payment.create.mock.calls[0][0] as {
      data: { createdAt: Date };
    };
    const buildArgs = vnpayMock.buildPayUrl.mock.calls[0][0] as {
      createDate: Date;
    };
    expect(buildArgs.createDate).toBe(createArgs.data.createdAt);

    expect(result).toEqual(payment());
  });

  it('CARD gửi bankCode VNBANK', async () => {
    mockOrder();
    prismaMock.payment.create.mockResolvedValue(payment({ method: 'CARD' }));

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

  it('applyResult thành công: PAID + cộng điểm 1 lần', async () => {
    prismaMock.payment.findUnique.mockResolvedValue({
      id: 1,
      orderId: 10,
      status: 'PENDING',
      amount: 50000,
    });
    prismaMock.order.findUnique.mockResolvedValue({
      id: 10,
      status: 'PENDING',
      userId: 7,
    });

    const result = await service.applyResult(
      payment(),
      {
        responseCode: '00',
        transactionStatus: '00',
        transactionNo: 'VNP123',
        payDate: '20261027230000',
      },
      'SUCCESS',
    );

    expect(result).toEqual({
      orderId: 10,
      orderStatus: 'PAID',
      success: true,
    });
    expect(prismaMock.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: 'PENDING' },
      data: {
        status: 'SUCCESS',
        transactionNo: 'VNP123',
        payDate: '20261027230000',
      },
    });
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
      where: { id: 10, status: 'PENDING' },
      data: { status: 'PAID' },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { loyaltyPoints: { increment: 5 } },
    });
    expect(prismaMock.loyaltyTransaction.create).toHaveBeenCalledWith({
      data: { userId: 7, orderId: 10, type: 'EARN', points: 5 },
    });
  });

  it('applyResult gọi 2 lần: không cộng điểm lần hai', async () => {
    prismaMock.payment.findUnique
      .mockResolvedValueOnce({
        id: 1,
        orderId: 10,
        status: 'PENDING',
        amount: 50000,
      })
      .mockResolvedValueOnce({
        id: 1,
        orderId: 10,
        status: 'SUCCESS',
        amount: 50000,
      });
    prismaMock.order.findUnique
      .mockResolvedValueOnce({
        id: 10,
        status: 'PENDING',
        userId: 7,
      })
      .mockResolvedValueOnce({
        id: 10,
        status: 'PAID',
        userId: 7,
      });

    const result = {
      responseCode: '00',
      transactionStatus: '00',
      transactionNo: 'VNP123',
      payDate: '20261027230000',
    };
    await service.applyResult(payment(), result, 'SUCCESS');
    await service.applyResult(payment(), result, 'SUCCESS');

    expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.loyaltyTransaction.create).toHaveBeenCalledTimes(1);
  });

  it('applyResult khách hủy: Payment FAILED + đơn PAYMENT_FAILED', async () => {
    prismaMock.payment.findUnique.mockResolvedValue({
      id: 1,
      orderId: 10,
      status: 'PENDING',
      amount: 50000,
    });
    prismaMock.order.findUnique
      .mockResolvedValueOnce({
        id: 10,
        status: 'PENDING',
        userId: 7,
      })
      .mockResolvedValueOnce({ status: 'PAYMENT_FAILED' });

    const result = await service.applyResult(
      payment(),
      {
        responseCode: '24',
        transactionStatus: '',
        transactionNo: '',
        payDate: '',
      },
      'FAILED',
    );

    expect(result).toEqual({
      orderId: 10,
      orderStatus: 'PAYMENT_FAILED',
      success: false,
    });
    expect(prismaMock.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: 'PENDING' },
      data: { status: 'FAILED' },
    });
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
      where: { id: 10, status: 'PENDING' },
      data: { status: 'PAYMENT_FAILED' },
    });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('applyResult thành công khi đơn đã hủy: gọi refundOrder', async () => {
    prismaMock.payment.findUnique.mockResolvedValue({
      id: 1,
      orderId: 10,
      status: 'PENDING',
      amount: 50000,
    });
    prismaMock.order.findUnique
      .mockResolvedValueOnce({
        id: 10,
        status: 'CANCELLED',
        userId: 7,
      })
      .mockResolvedValueOnce({ status: 'CANCELLED' });
    prismaMock.order.updateMany.mockResolvedValue({ count: 0 });
    const refundSpy = jest.spyOn(service, 'refundOrder').mockResolvedValue();

    const result = await service.applyResult(
      payment(),
      {
        responseCode: '00',
        transactionStatus: '00',
        transactionNo: 'VNP123',
        payDate: '20261027230000',
      },
      'SUCCESS',
    );

    expect(result).toEqual({
      orderId: 10,
      orderStatus: 'CANCELLED',
      success: true,
    });
    expect(prismaMock.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SUCCESS' }),
      }),
    );
    expect(refundSpy).toHaveBeenCalledWith(10);
  });

  it('revokeLoyaltyPoints: trừ đúng số điểm và không để âm', async () => {
    prismaMock.loyaltyTransaction.findUnique
      .mockResolvedValueOnce({ userId: 7, points: 5 })
      .mockResolvedValueOnce(null);
    prismaMock.user.findUnique.mockResolvedValue({ loyaltyPoints: 3 });

    await service.revokeLoyaltyPoints(
      prismaMock as unknown as Prisma.TransactionClient,
      10,
    );

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { loyaltyPoints: { decrement: 3 } },
    });
    expect(prismaMock.loyaltyTransaction.create).toHaveBeenCalledWith({
      data: { userId: 7, orderId: 10, type: 'REVOKE', points: -3 },
    });
  });

  it('revokeLoyaltyPoints: chưa từng cộng điểm thì không làm gì', async () => {
    prismaMock.loyaltyTransaction.findUnique.mockResolvedValue(null);

    await service.revokeLoyaltyPoints(
      prismaMock as unknown as Prisma.TransactionClient,
      10,
    );

    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(prismaMock.loyaltyTransaction.create).not.toHaveBeenCalled();
  });

  it('revokeLoyaltyPoints: đã trừ rồi thì không trừ lần hai', async () => {
    prismaMock.loyaltyTransaction.findUnique
      .mockResolvedValueOnce({ userId: 7, points: 5 })
      .mockResolvedValueOnce({ id: 1 });

    await service.revokeLoyaltyPoints(
      prismaMock as unknown as Prisma.TransactionClient,
      10,
    );

    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(prismaMock.loyaltyTransaction.create).not.toHaveBeenCalled();
  });

  it('refundOrder thành công: PENDING -> SUCCESS + refundedAt', async () => {
    prismaMock.payment.findFirst.mockResolvedValue(
      payment({
        status: 'SUCCESS',
        transactionNo: 'VNP123',
        payDate: '20261027230000',
        refundStatus: null,
      }),
    );

    await service.refundOrder(10);

    expect(prismaMock.payment.update).toHaveBeenNthCalledWith(1, {
      where: { id: 1 },
      data: { refundStatus: 'PENDING' },
    });
    expect(vnpayMock.refund).toHaveBeenCalledWith({
      txnRef: 'BL7K2M9QX4P2AB',
      amount: 50000,
      transactionNo: 'VNP123',
      transactionDate: '20261027230000',
      createBy: 'BrewLite',
    });
    expect(prismaMock.payment.update).toHaveBeenNthCalledWith(2, {
      where: { id: 1 },
      data: { refundStatus: 'SUCCESS', refundedAt: expect.any(Date) },
    });
  });

  it('refundOrder lỗi VNPay: đánh FAILED và không ném lỗi', async () => {
    prismaMock.payment.findFirst.mockResolvedValue(
      payment({
        status: 'SUCCESS',
        transactionNo: 'VNP123',
        payDate: '20261027230000',
      }),
    );
    vnpayMock.refund.mockRejectedValue(new Error('network'));

    await expect(service.refundOrder(10)).resolves.toBeUndefined();

    expect(prismaMock.payment.update).toHaveBeenNthCalledWith(1, {
      where: { id: 1 },
      data: { refundStatus: 'PENDING' },
    });
    expect(prismaMock.payment.update).toHaveBeenNthCalledWith(2, {
      where: { id: 1 },
      data: { refundStatus: 'FAILED' },
    });
  });

  it('retryRefunds: gọi lại các Payment PENDING/FAILED cũ hơn 1 phút', async () => {
    prismaMock.payment.findMany.mockResolvedValue([
      { orderId: 10 },
      { orderId: 11 },
    ]);
    const refundSpy = jest.spyOn(service, 'refundOrder').mockResolvedValue();

    await service.retryRefunds();

    expect(prismaMock.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          refundStatus: { in: ['PENDING', 'FAILED'] },
          createdAt: { lt: expect.any(Date) },
        },
        distinct: ['orderId'],
      }),
    );
    expect(refundSpy).toHaveBeenNthCalledWith(1, 10);
    expect(refundSpy).toHaveBeenNthCalledWith(2, 11);
  });

  it('syncOrder: tối đa 1 lần hỏi VNPay mỗi 5 giây', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 10,
      status: 'PAID',
    });
    prismaMock.payment.findFirst.mockResolvedValue(
      payment({ status: 'PENDING' }),
    );
    const applySpy = jest.spyOn(service, 'applyResult').mockResolvedValue({
      orderId: 10,
      orderStatus: 'PAID',
      success: true,
    });

    const first = await service.syncOrder(10);
    const second = await service.syncOrder(10);

    expect(first).toEqual({ orderStatus: 'PAID' });
    expect(second).toEqual({ orderStatus: 'PAID' });
    expect(vnpayMock.queryTransaction).toHaveBeenCalledTimes(1);
    expect(applySpy).toHaveBeenCalledTimes(1);
  });

  it('syncOrder querydr 00 + 01: giữ PENDING và không ghi gì', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 10,
      status: 'PENDING',
    });
    prismaMock.payment.findFirst.mockResolvedValue(
      payment({ status: 'PENDING' }),
    );
    vnpayMock.queryTransaction.mockResolvedValue({
      responseCode: '00',
      transactionStatus: '01',
      transactionNo: '',
      payDate: '',
      message: 'pending',
      raw: {},
    });

    await expect(service.syncOrder(10)).resolves.toEqual({
      orderStatus: 'PENDING',
    });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.payment.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it.each(['94', '91'])(
    'syncOrder querydr %s: không đổi Payment hay đơn',
    async (responseCode) => {
      prismaMock.order.findUnique.mockResolvedValue({
        id: 10,
        status: 'PENDING',
      });
      prismaMock.payment.findFirst.mockResolvedValue(
        payment({ status: 'PENDING' }),
      );
      vnpayMock.queryTransaction.mockResolvedValue({
        responseCode,
        transactionStatus: '',
        transactionNo: '',
        payDate: '',
        message: 'not ready',
        raw: {},
      });

      await expect(service.syncOrder(10)).resolves.toEqual({
        orderStatus: 'PENDING',
      });

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(prismaMock.payment.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    },
  );

  it('syncOrder querydr 00 + 02: Payment FAILED, đơn PAYMENT_FAILED', async () => {
    prismaMock.order.findUnique
      .mockResolvedValueOnce({ id: 10, status: 'PENDING' })
      .mockResolvedValueOnce({ id: 10, status: 'PENDING', userId: 7 })
      .mockResolvedValueOnce({ status: 'PAYMENT_FAILED' });
    prismaMock.payment.findFirst.mockResolvedValue(
      payment({ status: 'PENDING' }),
    );
    prismaMock.payment.findUnique.mockResolvedValue({
      id: 1,
      orderId: 10,
      status: 'PENDING',
      amount: 50000,
    });
    vnpayMock.queryTransaction.mockResolvedValue({
      responseCode: '00',
      transactionStatus: '02',
      transactionNo: '',
      payDate: '',
      message: 'failed',
      raw: {},
    });

    await expect(service.syncOrder(10)).resolves.toEqual({
      orderStatus: 'PAYMENT_FAILED',
    });

    expect(prismaMock.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: 'PENDING' },
      data: { status: 'FAILED' },
    });
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
      where: { id: 10, status: 'PENDING' },
      data: { status: 'PAYMENT_FAILED' },
    });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('syncForUser: đơn của người khác báo NotFound', async () => {
    prismaMock.order.findFirst.mockResolvedValue(null);

    await expect(service.syncForUser(7, 10)).rejects.toThrow(NotFoundException);
    expect(vnpayMock.queryTransaction).not.toHaveBeenCalled();
  });

  it('handleReturn sai chữ ký: báo BadRequest', async () => {
    vnpayMock.verifyReturn.mockReturnValue(false);

    await expect(service.handleReturn({})).rejects.toThrow(BadRequestException);
  });

  it('handleReturn: hỏi lại VNPay rồi applyResult', async () => {
    prismaMock.payment.findUnique.mockResolvedValue(payment());
    const applySpy = jest.spyOn(service, 'applyResult').mockResolvedValue({
      orderId: 10,
      orderStatus: 'PAID',
      success: true,
    });

    const result = await service.handleReturn(
      { vnp_TxnRef: 'BL7K2M9QX4P2AB' },
      '1.2.3.4',
    );

    expect(vnpayMock.queryTransaction).toHaveBeenCalledWith({
      txnRef: 'BL7K2M9QX4P2AB',
      transactionDate: createdAt,
      ipAddr: '1.2.3.4',
    });
    expect(applySpy).toHaveBeenCalledWith(
      payment(),
      expect.anything(),
      'SUCCESS',
    );
    expect(result).toEqual({
      orderId: 10,
      orderStatus: 'PAID',
      success: true,
    });
  });

  it('handleReturn querydr 00 + 01 nhưng khách hủy: applyResult FAILED', async () => {
    prismaMock.payment.findUnique.mockResolvedValue(payment());
    vnpayMock.queryTransaction.mockResolvedValue({
      responseCode: '00',
      transactionStatus: '01',
      transactionNo: '',
      payDate: '',
      message: 'pending',
      raw: {},
    });
    const applySpy = jest.spyOn(service, 'applyResult').mockResolvedValue({
      orderId: 10,
      orderStatus: 'PAYMENT_FAILED',
      success: false,
    });

    const result = await service.handleReturn(
      {
        vnp_TxnRef: 'BL7K2M9QX4P2AB',
        vnp_ResponseCode: '24',
      },
      '1.2.3.4',
    );

    expect(applySpy).toHaveBeenCalledWith(
      payment(),
      expect.objectContaining({
        responseCode: '00',
        transactionStatus: '01',
      }),
      'FAILED',
    );
    expect(result).toEqual({
      orderId: 10,
      orderStatus: 'PAYMENT_FAILED',
      success: false,
    });
  });

  it('handleIpn sai chữ ký: trả 97', async () => {
    vnpayMock.verifyReturn.mockReturnValue(false);

    await expect(service.handleIpn({})).resolves.toEqual({
      RspCode: '97',
      Message: 'Invalid signature',
    });
  });

  it('handleIpn sai số tiền: trả 04', async () => {
    prismaMock.payment.findUnique.mockResolvedValue(payment());

    await expect(
      service.handleIpn({
        vnp_TxnRef: 'BL7K2M9QX4P2AB',
        vnp_Amount: '1',
      }),
    ).resolves.toEqual({
      RspCode: '04',
      Message: 'Invalid amount',
    });
  });

  it('handleIpn Payment đã xử lý: trả 02', async () => {
    prismaMock.payment.findUnique.mockResolvedValue(
      payment({ status: 'SUCCESS' }),
    );

    await expect(
      service.handleIpn({
        vnp_TxnRef: 'BL7K2M9QX4P2AB',
        vnp_Amount: '5000000',
      }),
    ).resolves.toEqual({
      RspCode: '02',
      Message: 'Order already confirmed',
    });
  });

  it('handleIpn hợp lệ: applyResult và trả 00', async () => {
    prismaMock.payment.findUnique.mockResolvedValue(payment());
    const applySpy = jest.spyOn(service, 'applyResult').mockResolvedValue({
      orderId: 10,
      orderStatus: 'PAID',
      success: true,
    });

    await expect(
      service.handleIpn({
        vnp_TxnRef: 'BL7K2M9QX4P2AB',
        vnp_Amount: '5000000',
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_TransactionNo: 'VNP123',
        vnp_PayDate: '20261027230000',
      }),
    ).resolves.toEqual({
      RspCode: '00',
      Message: 'Confirm Success',
    });
    expect(applySpy).toHaveBeenCalledWith(
      payment(),
      {
        responseCode: '00',
        transactionStatus: '00',
        transactionNo: 'VNP123',
        payDate: '20261027230000',
      },
      'SUCCESS',
    );
  });

  it('handleIpn khách hủy: applyResult FAILED và vẫn trả 00', async () => {
    prismaMock.payment.findUnique.mockResolvedValue(payment());
    const applySpy = jest.spyOn(service, 'applyResult').mockResolvedValue({
      orderId: 10,
      orderStatus: 'PAYMENT_FAILED',
      success: false,
    });

    await expect(
      service.handleIpn({
        vnp_TxnRef: 'BL7K2M9QX4P2AB',
        vnp_Amount: '5000000',
        vnp_ResponseCode: '24',
        vnp_TransactionStatus: '',
        vnp_TransactionNo: '',
        vnp_PayDate: '',
      }),
    ).resolves.toEqual({
      RspCode: '00',
      Message: 'Confirm Success',
    });
    expect(applySpy).toHaveBeenCalledWith(
      payment(),
      expect.objectContaining({
        responseCode: '24',
        transactionStatus: '',
      }),
      'FAILED',
    );
  });
});
