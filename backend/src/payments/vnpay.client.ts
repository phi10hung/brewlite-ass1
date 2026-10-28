import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

type VnpayParams = Record<string, string>;

export type BuildPayUrlInput = {
  txnRef: string;
  amount: number;
  orderInfo: string;
  ipAddr: string;
  createDate: Date;
  expiresAt: Date;
  bankCode?: string;
};

export type QueryTransactionInput = {
  txnRef: string;
  transactionDate: string | Date;
  ipAddr?: string;
};

export type RefundInput = {
  txnRef: string;
  amount: number;
  transactionNo: string;
  transactionDate: string | Date;
  createBy: string;
  ipAddr?: string;
};

export type QueryTransactionResult = {
  responseCode: string;
  transactionStatus: string;
  transactionNo: string;
  payDate: string;
  message: string;
  raw: Record<string, unknown>;
};

export type RefundResult = {
  responseCode: string;
  message: string;
  raw: Record<string, unknown>;
};

function encodeValue(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, '+');
}

// VNPay ký trên chuỗi đã sắp xếp theo key và đã URL-encode.
function sortObject(params: VnpayParams): VnpayParams {
  return Object.keys(params)
    .sort()
    .reduce<VnpayParams>((sorted, key) => {
      sorted[encodeURIComponent(key)] = encodeValue(params[key]);
      return sorted;
    }, {});
}

function toQueryString(params: VnpayParams): string {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

function normalizeQuery(query: Record<string, unknown>): VnpayParams {
  const params: VnpayParams = {};

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;

    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === 'string') {
      params[key] = first;
    } else if (typeof first === 'number') {
      params[key] = String(first);
    }
  }

  return params;
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left.toLowerCase(), 'utf8');
  const b = Buffer.from(right.toLowerCase(), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function normalizeIpAddress(ipAddr: string): string {
  const trimmed = ipAddr.trim();

  if (!trimmed || trimmed === '::1') return '127.0.0.1';
  if (trimmed.startsWith('::ffff:')) return trimmed.slice('::ffff:'.length);
  return trimmed;
}

function normalizeTransactionDate(value: string | Date): string {
  if (value instanceof Date) return formatVnpayDate(value);

  const trimmed = value.trim();
  if (!/^\d{14}$/.test(trimmed)) {
    throw new Error('Ngày giao dịch VNPay phải có định dạng yyyyMMddHHmmss');
  }
  return trimmed;
}

// VNPay dùng giờ Việt Nam (GMT+7), không phụ thuộc timezone của server.
export function formatVnpayDate(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error('Ngày giao dịch VNPay không hợp lệ');
  }

  const gmt7 = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, '0');

  return [
    gmt7.getUTCFullYear(),
    pad(gmt7.getUTCMonth() + 1),
    pad(gmt7.getUTCDate()),
    pad(gmt7.getUTCHours()),
    pad(gmt7.getUTCMinutes()),
    pad(gmt7.getUTCSeconds()),
  ].join('');
}

@Injectable()
export class VnpayClient {
  private readonly tmnCode: string;
  private readonly hashSecret: string;
  private readonly payUrl: string;
  private readonly apiUrl: string;
  private readonly returnUrl: string;

  constructor(config: ConfigService) {
    this.tmnCode = this.required(config, 'VNP_TMN_CODE');
    this.hashSecret = this.required(config, 'VNP_HASH_SECRET');
    this.payUrl = this.required(config, 'VNP_PAY_URL').replace(/\/+$/, '');
    this.apiUrl = this.required(config, 'VNP_API_URL').replace(/\/+$/, '');
    this.returnUrl = this.required(config, 'VNP_RETURN_URL');
  }

  buildPayUrl(input: BuildPayUrlInput): string {
    this.assertTxnRef(input.txnRef);
    this.assertAmount(input.amount);
    this.assertOrderInfo(input.orderInfo);

    const params: VnpayParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: input.txnRef,
      vnp_OrderInfo: input.orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: String(Math.round(input.amount * 100)),
      vnp_ReturnUrl: this.returnUrl,
      vnp_IpAddr: normalizeIpAddress(input.ipAddr),
      vnp_CreateDate: formatVnpayDate(input.createDate),
      vnp_ExpireDate: formatVnpayDate(input.expiresAt),
    };

    if (input.bankCode) {
      params.vnp_BankCode = input.bankCode;
    }

    const signData = toQueryString(sortObject(params));
    const secureHash = this.hmacSha512(signData);
    const separator = this.payUrl.includes('?') ? '&' : '?';

    return `${this.payUrl}${separator}${signData}&vnp_SecureHash=${secureHash}`;
  }

  verifyReturn(query: Record<string, unknown>): boolean {
    const params = normalizeQuery(query);
    const secureHash = params.vnp_SecureHash;

    if (!secureHash) return false;

    delete params.vnp_SecureHash;
    delete params.vnp_SecureHashType;

    const signData = toQueryString(sortObject(params));
    const expected = this.hmacSha512(signData);

    return safeEqual(expected, secureHash);
  }

  async queryTransaction(
    input: QueryTransactionInput,
  ): Promise<QueryTransactionResult> {
    this.assertTxnRef(input.txnRef);

    const requestId = this.createRequestId();
    const transactionDate = normalizeTransactionDate(input.transactionDate);
    const createDate = formatVnpayDate(new Date());
    const ipAddr = normalizeIpAddress(input.ipAddr ?? '127.0.0.1');
    const orderInfo = `Truy van giao dich ${input.txnRef}`;

    // Đúng thứ tự chuỗi ký của VNPay cho vnp_Command=querydr.
    const signData = [
      requestId,
      '2.1.0',
      'querydr',
      this.tmnCode,
      input.txnRef,
      transactionDate,
      createDate,
      ipAddr,
      orderInfo,
    ].join('|');

    const payload = {
      vnp_RequestId: requestId,
      vnp_Version: '2.1.0',
      vnp_Command: 'querydr',
      vnp_TmnCode: this.tmnCode,
      vnp_TxnRef: input.txnRef,
      vnp_OrderInfo: orderInfo,
      vnp_TransactionDate: transactionDate,
      vnp_CreateDate: createDate,
      vnp_IpAddr: ipAddr,
      vnp_SecureHash: this.hmacSha512(signData),
    };

    const data = await this.postToVnpay(payload);

    return {
      responseCode: asString(data.vnp_ResponseCode),
      transactionStatus: asString(data.vnp_TransactionStatus),
      transactionNo: asString(data.vnp_TransactionNo),
      payDate: asString(data.vnp_PayDate),
      message: asString(data.vnp_Message),
      raw: data,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    this.assertTxnRef(input.txnRef);
    this.assertAmount(input.amount);
    this.assertCreateBy(input.createBy);

    const transactionNo = input.transactionNo.trim();
    if (!transactionNo) {
      throw new Error('Thiếu mã giao dịch VNPay để hoàn tiền');
    }

    const requestId = this.createRequestId();
    const transactionDate = normalizeTransactionDate(input.transactionDate);
    const createDate = formatVnpayDate(new Date());
    const ipAddr = normalizeIpAddress(input.ipAddr ?? '127.0.0.1');
    const orderInfo = `Hoan tien don ${input.txnRef}`;
    const amount = String(Math.round(input.amount * 100));

    // Đúng thứ tự chuỗi ký của VNPay cho vnp_Command=refund.
    const signData = [
      requestId,
      '2.1.0',
      'refund',
      this.tmnCode,
      '02',
      input.txnRef,
      amount,
      transactionNo,
      transactionDate,
      input.createBy,
      createDate,
      ipAddr,
      orderInfo,
    ].join('|');

    const payload = {
      vnp_RequestId: requestId,
      vnp_Version: '2.1.0',
      vnp_Command: 'refund',
      vnp_TmnCode: this.tmnCode,
      vnp_TransactionType: '02',
      vnp_TxnRef: input.txnRef,
      vnp_Amount: amount,
      vnp_OrderInfo: orderInfo,
      vnp_TransactionNo: transactionNo,
      vnp_TransactionDate: transactionDate,
      vnp_CreateBy: input.createBy,
      vnp_CreateDate: createDate,
      vnp_IpAddr: ipAddr,
      vnp_SecureHash: this.hmacSha512(signData),
    };

    const data = await this.postToVnpay(payload);

    return {
      responseCode: asString(data.vnp_ResponseCode),
      message: asString(data.vnp_Message),
      raw: data,
    };
  }

  private async postToVnpay(
    payload: Record<string, string>,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`VNPay API trả về HTTP ${response.status}`);
    }

    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('VNPay API trả về dữ liệu không hợp lệ');
    }

    return data as Record<string, unknown>;
  }

  private hmacSha512(data: string): string {
    return createHmac('sha512', this.hashSecret).update(data, 'utf8').digest('hex');
  }

  private createRequestId(): string {
    return randomBytes(12).toString('hex');
  }

  private assertTxnRef(txnRef: string): void {
    if (!/^[A-Za-z0-9]{1,100}$/.test(txnRef)) {
      throw new Error('Mã giao dịch VNPay chỉ được chứa chữ và số');
    }
  }

  private assertAmount(amount: number): void {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new Error('Số tiền thanh toán VNPay không hợp lệ');
    }
  }

  private assertOrderInfo(orderInfo: string): void {
    if (!orderInfo.trim() || orderInfo.length > 255) {
      throw new Error('Nội dung đơn hàng VNPay không hợp lệ');
    }
  }

  private assertCreateBy(createBy: string): void {
    if (!createBy.trim() || createBy.length > 245) {
      throw new Error('Người tạo hoàn tiền VNPay không hợp lệ');
    }
  }

  private required(config: ConfigService, key: string): string {
    const value = config.get<string>(key)?.trim();
    if (!value) {
      throw new Error(`Thiếu biến môi trường ${key}`);
    }
    return value;
  }
}
