import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { formatVnpayDate, VnpayClient } from './vnpay.client';

const configValues: Record<string, string> = {
  VNP_TMN_CODE: 'TESTTMN',
  VNP_HASH_SECRET: 'secret',
  VNP_PAY_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  VNP_API_URL: 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
  VNP_RETURN_URL: 'http://localhost:3000/payment/result',
};

const configMock = {
  get: jest.fn((key: string): string | undefined => configValues[key]),
};

function hmac(data: string): string {
  return createHmac('sha512', configValues.VNP_HASH_SECRET)
    .update(data, 'utf8')
    .digest('hex');
}

function mockFetch(data: Record<string, unknown>) {
  return jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => data,
  } as unknown as Response);
}

describe('VnpayClient', () => {
  let client: VnpayClient;

  beforeEach(() => {
    client = new VnpayClient(configMock as unknown as ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('tạo link thanh toán rồi verifyReturn lại đúng', () => {
    const createDate = new Date('2026-10-27T15:00:00.000Z');
    const expiresAt = new Date('2026-10-27T16:00:00.000Z');
    const payUrl = client.buildPayUrl({
      txnRef: 'BL7K2M9QX4P2AB',
      amount: 50000,
      orderInfo: 'Thanh toan don BL-7K2M9Q',
      ipAddr: '127.0.0.1',
      createDate,
      expiresAt,
      bankCode: 'VNBANK',
    });
    const parsed = new URL(payUrl);
    const query = Object.fromEntries(parsed.searchParams.entries());

    expect(parsed.searchParams.get('vnp_Amount')).toBe('5000000');
    expect(parsed.searchParams.get('vnp_TxnRef')).toBe('BL7K2M9QX4P2AB');
    expect(parsed.searchParams.get('vnp_OrderInfo')).toBe(
      'Thanh toan don BL-7K2M9Q',
    );
    expect(parsed.searchParams.get('vnp_BankCode')).toBe('VNBANK');
    expect(parsed.searchParams.get('vnp_ExpireDate')).toBe('20261027230000');
    expect(parsed.searchParams.get('vnp_CreateDate')).toBe(
      formatVnpayDate(createDate),
    );
    expect(parsed.searchParams.get('vnp_CreateDate')).toBe('20261027220000');
    expect(parsed.searchParams.get('vnp_SecureHash')).toMatch(
      /^[a-f0-9]{128}$/,
    );
    expect(client.verifyReturn(query)).toBe(true);

    expect(client.verifyReturn({ ...query, vnp_Amount: '1' })).toBe(false);
  });

  it('querydr: đúng body và chữ ký', async () => {
    const fetchMock = mockFetch({
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TransactionNo: 'VNP123',
      vnp_PayDate: '20261027230000',
      vnp_Message: 'ok',
    });

    const result = await client.queryTransaction({
      txnRef: 'BL7K2M9QX4P2AB',
      transactionDate: '20261027230000',
      ipAddr: '1.2.3.4',
    });

    expect(result).toMatchObject({
      responseCode: '00',
      transactionStatus: '00',
      transactionNo: 'VNP123',
      payDate: '20261027230000',
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, string>;

    expect(body).toMatchObject({
      vnp_Version: '2.1.0',
      vnp_Command: 'querydr',
      vnp_TmnCode: 'TESTTMN',
      vnp_TxnRef: 'BL7K2M9QX4P2AB',
      vnp_TransactionDate: '20261027230000',
      vnp_IpAddr: '1.2.3.4',
      vnp_OrderInfo: 'Truy van giao dich BL7K2M9QX4P2AB',
    });
    expect(body.vnp_CreateDate).toMatch(/^\d{14}$/);

    const signData = [
      body.vnp_RequestId,
      body.vnp_Version,
      body.vnp_Command,
      body.vnp_TmnCode,
      body.vnp_TxnRef,
      body.vnp_TransactionDate,
      body.vnp_CreateDate,
      body.vnp_IpAddr,
      body.vnp_OrderInfo,
    ].join('|');
    expect(body.vnp_SecureHash).toBe(hmac(signData));
  });

  it('refund: đúng body và chữ ký', async () => {
    const fetchMock = mockFetch({
      vnp_ResponseCode: '00',
      vnp_Message: 'ok',
    });

    const result = await client.refund({
      txnRef: 'BL7K2M9QX4P2AB',
      amount: 50000,
      transactionNo: 'VNP123',
      transactionDate: '20261027230000',
      createBy: 'BrewLite',
    });

    expect(result.responseCode).toBe('00');

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, string>;

    expect(body).toMatchObject({
      vnp_Version: '2.1.0',
      vnp_Command: 'refund',
      vnp_TmnCode: 'TESTTMN',
      vnp_TransactionType: '02',
      vnp_TxnRef: 'BL7K2M9QX4P2AB',
      vnp_Amount: '5000000',
      vnp_TransactionNo: 'VNP123',
      vnp_TransactionDate: '20261027230000',
      vnp_CreateBy: 'BrewLite',
      vnp_IpAddr: '127.0.0.1',
      vnp_OrderInfo: 'Hoan tien don BL7K2M9QX4P2AB',
    });
    expect(body.vnp_CreateDate).toMatch(/^\d{14}$/);

    const signData = [
      body.vnp_RequestId,
      body.vnp_Version,
      body.vnp_Command,
      body.vnp_TmnCode,
      body.vnp_TransactionType,
      body.vnp_TxnRef,
      body.vnp_Amount,
      body.vnp_TransactionNo,
      body.vnp_TransactionDate,
      body.vnp_CreateBy,
      body.vnp_CreateDate,
      body.vnp_IpAddr,
      body.vnp_OrderInfo,
    ].join('|');
    expect(body.vnp_SecureHash).toBe(hmac(signData));
  });

  it('thiếu khoá VNPay: constructor vẫn chạy, gọi VNPay mới báo 503', async () => {
    const emptyConfig = {
      get: jest.fn(),
    } as unknown as ConfigService;

    expect(() => new VnpayClient(emptyConfig)).not.toThrow();
    const emptyClient = new VnpayClient(emptyConfig);

    expect(() =>
      emptyClient.buildPayUrl({
        txnRef: 'BL7K2M9QX4P2AB',
        amount: 50000,
        orderInfo: 'Thanh toan don BL-7K2M9Q',
        ipAddr: '127.0.0.1',
        createDate: new Date('2026-10-27T15:00:00.000Z'),
        expiresAt: new Date('2026-10-27T16:00:00.000Z'),
      }),
    ).toThrow(ServiceUnavailableException);

    await expect(
      emptyClient.queryTransaction({
        txnRef: 'BL7K2M9QX4P2AB',
        transactionDate: '20261027220000',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('format ngày VNPay theo GMT+7', () => {
    expect(formatVnpayDate(new Date('2026-10-27T16:00:00.000Z'))).toBe(
      '20261027230000',
    );
  });
});
