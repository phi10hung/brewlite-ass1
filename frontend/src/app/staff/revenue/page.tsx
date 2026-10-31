'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { formatDateTime, formatVnd } from '@/lib/format';
import { getOrderStatus, getRefundLabel, type RefundStatus } from '@/lib/order-status';

type Group = 'SUCCESS' | 'REFUND' | 'PENDING' | 'FAILED';

type Transaction = {
  id: number;
  group: Group;
  method: 'WALLET' | 'CARD';
  amount: number;
  transactionNo: string | null;
  paidAt: string | null;
  refundStatus: RefundStatus | null;
  refundedAt: string | null;
  createdAt: string;
  order: {
    code: string;
    status: string;
    subtotal: number;
    discount: number;
    total: number;
    promotionCode: string | null;
    expiresAt: string | null;
    createdAt: string;
    user: { name: string };
    items: {
      id: number;
      productName: string;
      size: string;
      toppings: string[];
      quantity: number;
      lineTotal: number;
    }[];
  };
};

type Revenue = {
  totalRevenue: number;
  refundAmount: number;
  counts: Record<Group, number>;
  transactions: Transaction[];
};

const GROUPS: { value: Group; label: string; className: string }[] = [
  { value: 'SUCCESS', label: 'Thành công', className: 'bg-green-100 text-green-800' },
  { value: 'REFUND', label: 'Hoàn tiền', className: 'bg-rose-100 text-rose-800' },
  { value: 'PENDING', label: 'Đang chờ', className: 'bg-amber-100 text-amber-800' },
  { value: 'FAILED', label: 'Thất bại', className: 'bg-red-100 text-red-800' },
];

const METHOD_LABEL = { WALLET: 'Ví', CARD: 'Thẻ' };

function getGroup(value: Group) {
  return GROUPS.find((g) => g.value === value) ?? GROUPS[0];
}

// Dòng thông tin thêm khi mở chi tiết, tùy nhóm giao dịch
function statusNote(t: Transaction) {
  switch (t.group) {
    case 'SUCCESS':
      return `Trạng thái đơn: ${getOrderStatus(t.order.status).label}`;
    case 'REFUND':
      return t.refundStatus === 'SUCCESS'
        ? `Đã hoàn lúc ${formatDateTime(t.refundedAt)}`
        : 'Đơn đã hủy, VNPay chưa xác nhận hoàn tiền';
    case 'PENDING':
      return `Hạn thanh toán ${formatDateTime(t.order.expiresAt)}`;
    default:
      return 'Thanh toán không thành công';
  }
}

export default function RevenuePage() {
  const [data, setData] = useState<Revenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [filter, setFilter] = useState<Group | ''>('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Revenue>('/staff/revenue')
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : 'Có lỗi xảy ra';
        // API trả 403 với message "Chỉ nhân viên được truy cập"
        if (message.includes('nhân viên')) {
          setForbidden(true);
        } else {
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = () => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  };

  const changeFilter = (value: Group | '') => {
    setFilter(value);
    setOpenId(null);
  };

  if (forbidden) {
    return (
      <main className="mx-auto max-w-4xl p-4">
        <p className="py-10 text-center text-red-600">Bạn không có quyền xem trang này</p>
      </main>
    );
  }

  const transactions = (data?.transactions ?? []).filter((t) => !filter || t.group === filter);

  return (
    <main className="mx-auto max-w-4xl p-4">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Doanh thu</h1>
        <button
          onClick={reload}
          disabled={loading}
          className="rounded border border-amber-700 px-3 py-1 text-sm text-amber-700 disabled:opacity-50"
        >
          Tải lại
        </button>
      </div>
      <p className="mb-4 text-sm text-gray-600">
        Chỉ tính tiền VNPay đã xác nhận và đơn không bị hủy.
      </p>

      {loading && <p className="py-10 text-center text-gray-500">Đang tải...</p>}

      {!loading && error && (
        <div className="py-10 text-center">
          <p className="mb-3 text-red-600">{error}</p>
          <button onClick={reload} className="rounded bg-amber-700 px-4 py-2 text-white">
            Thử lại
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="mb-3 rounded-lg bg-amber-900 p-4 text-white">
            <p className="text-sm text-amber-100">Tiền đã vào</p>
            <p className="text-3xl font-bold">{formatVnd(data.totalRevenue)}</p>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {GROUPS.map((g) => (
              <div key={g.value} className="rounded-lg border bg-white p-3 shadow-sm">
                <p className="text-sm text-gray-600">{g.label}</p>
                <p className="text-2xl font-bold">{data.counts[g.value]}</p>
                {g.value === 'REFUND' && data.counts.REFUND > 0 && (
                  <p className="text-sm text-rose-700">{formatVnd(data.refundAmount)}</p>
                )}
              </div>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {[{ value: '' as const, label: 'Tất cả' }, ...GROUPS].map((f) => (
              <button
                key={f.value}
                onClick={() => changeFilter(f.value)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  filter === f.value ? 'bg-amber-700 text-white' : 'bg-white text-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {transactions.length === 0 && (
            <p className="py-10 text-center text-gray-500">Chưa có giao dịch nào</p>
          )}

          <ul className="space-y-3">
            {transactions.map((t) => {
              const group = getGroup(t.group);
              const open = openId === t.id;
              return (
                <li key={t.id} className="rounded-lg border bg-white shadow-sm">
                  <button
                    onClick={() => setOpenId(open ? null : t.id)}
                    aria-expanded={open}
                    className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-amber-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {t.transactionNo ?? 'Chưa có mã giao dịch'}
                      </p>
                      <p className="text-sm text-gray-700">
                        {t.order.code} · {t.order.user.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t.paidAt
                          ? `VNPay xác nhận ${formatDateTime(t.paidAt)}`
                          : `Tạo lúc ${formatDateTime(t.createdAt)}`}
                        {` · ${METHOD_LABEL[t.method]}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`mb-1 font-semibold ${
                          t.group === 'SUCCESS' ? 'text-green-700' : 'text-gray-700'
                        }`}
                      >
                        {t.group === 'SUCCESS' && '+'}
                        {formatVnd(t.amount)}
                      </p>
                      <span className={`rounded-full px-3 py-1 text-sm ${group.className}`}>
                        {t.group === 'REFUND'
                          ? getRefundLabel(t.refundStatus) || 'Đang hoàn tiền'
                          : group.label}
                      </span>
                    </div>
                  </button>

                  {open && (
                    <div className="border-t px-4 py-3 text-sm text-gray-700">
                      <ul>
                        {t.order.items.map((i) => (
                          <li key={i.id} className="flex justify-between gap-3">
                            <span>
                              {i.quantity} x {i.productName} ({i.size})
                              {i.toppings.length > 0 && ` + ${i.toppings.join(', ')}`}
                            </span>
                            <span className="whitespace-nowrap">{formatVnd(i.lineTotal)}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2">
                        Tạm tính {formatVnd(t.order.subtotal)}
                        {t.order.discount > 0 &&
                          ` · Giảm ${formatVnd(t.order.discount)}${
                            t.order.promotionCode ? ` (${t.order.promotionCode})` : ''
                          }`}
                      </p>
                      <p className="font-semibold">Tổng {formatVnd(t.order.total)}</p>
                      <p className="mt-2 text-gray-500">
                        Đặt lúc {formatDateTime(t.order.createdAt)}
                      </p>
                      <p>{statusNote(t)}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
