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
  const createdAt = new Date('2026-10-23T00:00:00.000Z');
  const payment = {
    id: 1,
    orderId: 10,
    method: 'WALLET' as const,
    status: 'SUCCESS' as const,
    amount: 50000,
    createdAt,
  };

  beforeEach(() => {
    createPayment.mockReset();
  });

  it('trả body id/status/amount khi thanh toán thành công', async () => {
    createPayment.mockResolvedValue(payment);

    await expect(
      controller.create(user, 'key-success', {
        orderId: 10,
        method: 'WALLET',
      }),
    ).resolves.toEqual({
      id: 1,
      status: 'SUCCESS',
      amount: 50000,
    });
    expect(createPayment).toHaveBeenCalledWith(7, 'key-success', {
      orderId: 10,
      method: 'WALLET',
    });
  });

  it('trả body FAILED thay vì ném lỗi khi giả lập thanh toán lỗi', async () => {
    createPayment.mockResolvedValue({ ...payment, status: 'FAILED' as const });

    await expect(
      controller.create(user, 'key-fail', {
        orderId: 10,
        method: 'CARD',
        simulate: 'fail',
      }),
    ).resolves.toEqual({
      id: 1,
      status: 'FAILED',
      amount: 50000,
    });
  });
});
