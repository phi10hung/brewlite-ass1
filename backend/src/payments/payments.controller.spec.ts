import type { AuthUser } from '../auth/auth.types';
import { PaymentsController } from './payments.controller';
import type { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  const createPayment = jest.fn();
  const controller = new PaymentsController({
    create: createPayment,
  } as unknown as PaymentsService);

  const user: AuthUser = {
    userId: 7,
    email: 'customer@example.com',
    role: 'CUSTOMER',
  };
  const createdAt = new Date('2026-10-27T00:00:00.000Z');
  const payment = {
    id: 1,
    orderId: 10,
    method: 'WALLET' as const,
    status: 'PENDING' as const,
    amount: 50000,
    payUrl: 'https://vnpay.test/pay',
    createdAt,
  };

  beforeEach(() => {
    createPayment.mockReset();
  });

  it('trả body id/status/amount/payUrl khi tạo link thanh toán', async () => {
    createPayment.mockResolvedValue(payment);

    await expect(
      controller.create(
        user,
        'key-success',
        { orderId: 10, method: 'WALLET' },
        '127.0.0.1',
      ),
    ).resolves.toEqual({
      id: 1,
      status: 'PENDING',
      amount: 50000,
      payUrl: 'https://vnpay.test/pay',
    });
    expect(createPayment).toHaveBeenCalledWith(
      7,
      'key-success',
      { orderId: 10, method: 'WALLET' },
      '127.0.0.1',
    );
  });
});
