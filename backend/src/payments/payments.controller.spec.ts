import type { AuthUser } from '../auth/auth.types';
import { PaymentsController } from './payments.controller';
import type { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  const createPayment = jest.fn();
  const handleReturn = jest.fn();
  const handleIpn = jest.fn();
  const syncForUser = jest.fn();
  const controller = new PaymentsController({
    create: createPayment,
    handleReturn,
    handleIpn,
    syncForUser,
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
    handleReturn.mockReset();
    handleIpn.mockReset();
    syncForUser.mockReset();
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

  it('chuyển query và IP của VNPay return cho service', async () => {
    const response = {
      orderId: 10,
      orderStatus: 'PAID' as const,
      success: true,
    };
    handleReturn.mockResolvedValue(response);

    await expect(
      controller.vnpayReturn({ vnp_TxnRef: 'BL7K2M9QX4P2AB' }, '1.2.3.4'),
    ).resolves.toEqual(response);
    expect(handleReturn).toHaveBeenCalledWith(
      { vnp_TxnRef: 'BL7K2M9QX4P2AB' },
      '1.2.3.4',
    );
  });

  it('chuyển query VNPay IPN cho service', async () => {
    const response = { RspCode: '00', Message: 'Confirm Success' };
    handleIpn.mockResolvedValue(response);

    await expect(
      controller.vnpayIpn({ vnp_TxnRef: 'BL7K2M9QX4P2AB' }),
    ).resolves.toEqual(response);
    expect(handleIpn).toHaveBeenCalledWith({
      vnp_TxnRef: 'BL7K2M9QX4P2AB',
    });
  });

  it('chuyển user và orderId sang sync', async () => {
    syncForUser.mockResolvedValue({ orderStatus: 'PAID' });

    await expect(controller.sync(user, 10)).resolves.toEqual({
      orderStatus: 'PAID',
    });
    expect(syncForUser).toHaveBeenCalledWith(7, 10);
  });
});
