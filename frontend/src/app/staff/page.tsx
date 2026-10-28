'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { getOrderStatus } from '@/lib/order-status';
import IngredientTable from './ingredient-table';

type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PAYMENT_FAILED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

type StaffOrder = {
  id: number;
  code: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  user: { id: number; name: string };
  items: {
    id: number;
    productName: string;
    size: string;
    toppings: string[];
    quantity: number;
  }[];
};

// Bước tiếp theo của nhân viên: PAID -> PREPARING -> READY -> COMPLETED
const NEXT_STEP: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  PAID: { status: 'PREPARING', label: 'Nhận đơn' },
  PREPARING: { status: 'READY', label: 'Pha xong' },
  READY: { status: 'COMPLETED', label: 'Giao khách' },
};

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'PAID', label: getOrderStatus('PAID').label },
  { value: 'PREPARING', label: getOrderStatus('PREPARING').label },
  { value: 'READY', label: getOrderStatus('READY').label },
  { value: 'COMPLETED', label: getOrderStatus('COMPLETED').label },
  { value: 'CANCELLED', label: getOrderStatus('CANCELLED').label },
];

function formatVnd(amount: number) {
  return amount.toLocaleString('vi-VN') + 'đ';
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN');
}

export default function StaffPage() {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [filter, setFilter] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const query = filter ? `?status=${filter}` : '';
    apiFetch<StaffOrder[]>(`/staff/orders${query}`)
      .then((data) => {
        if (cancelled) return;
        setOrders(data);
        setError(null);
        setForbidden(false);
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
  }, [filter, reloadKey]);

  const reload = () => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  };

  const changeFilter = (value: string) => {
    setLoading(true);
    setError(null);
    setActionError(null);
    setFilter(value);
  };

  // Đổi trạng thái; lỗi (kể cả 409 đơn vừa đổi) hiện ra và tải lại danh sách cho đúng
  const changeStatus = (order: StaffOrder, status: OrderStatus, failMessage: string) => {
    setBusyId(order.id);
    setActionError(null);
    apiFetch(`/staff/orders/${order.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
      .then(() => reload())
      .catch((e) => {
        setActionError(e instanceof Error ? e.message : failMessage);
        reload();
      })
      .finally(() => setBusyId(null));
  };

  const advance = (order: StaffOrder) => {
    const next = NEXT_STEP[order.status];
    if (!next) return;
    changeStatus(order, next.status, 'Không đổi được trạng thái');
  };

  // Hủy đơn: chỉ đơn Đã thanh toán, hỏi xác nhận trước khi hủy
  const cancelOrder = (order: StaffOrder) => {
    if (!window.confirm('Hủy đơn này? Khách sẽ được hoàn tiền.')) return;
    changeStatus(order, 'CANCELLED', 'Không hủy được đơn');
  };

  if (forbidden) {
    return (
      <main className="mx-auto max-w-4xl p-4">
        <p className="py-10 text-center text-red-600">Bạn không có quyền xem trang này</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Quản lý đơn hàng</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
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

      {actionError && <p className="mb-3 text-red-600">{actionError}</p>}

      {loading && <p className="py-10 text-center text-gray-500">Đang tải...</p>}

      {!loading && error && (
        <div className="py-10 text-center">
          <p className="mb-3 text-red-600">{error}</p>
          <button onClick={reload} className="rounded bg-amber-700 px-4 py-2 text-white">
            Thử lại
          </button>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <p className="py-10 text-center text-gray-500">Chưa có đơn nào</p>
      )}

      {!loading && !error && orders.length > 0 && (
        <ul className="space-y-3">
          {orders.map((o) => {
            const next = NEXT_STEP[o.status];
            const status = getOrderStatus(o.status);
            return (
              <li key={o.id} className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold">{o.code}</span>
                    <span className="ml-2 text-sm text-gray-500">{formatTime(o.createdAt)}</span>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm ${status.className}`}>
                    {status.label}
                  </span>
                </div>

                <p className="mt-1 text-sm text-gray-700">Khách: {o.user.name}</p>

                <ul className="mt-2 text-sm text-gray-700">
                  {o.items.map((i) => (
                    <li key={i.id}>
                      {i.quantity} x {i.productName} ({i.size})
                      {i.toppings.length > 0 && ` + ${i.toppings.join(', ')}`}
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex items-center justify-between">
                  <span className="font-semibold text-amber-700">{formatVnd(o.total)}</span>
                  <div className="flex gap-2">
                    {o.status === 'PAID' && (
                      <button
                        onClick={() => cancelOrder(o)}
                        disabled={busyId === o.id}
                        className="rounded border border-red-600 px-4 py-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Hủy đơn
                      </button>
                    )}
                    {next && (
                      <button
                        onClick={() => advance(o)}
                        disabled={busyId === o.id}
                        className="rounded bg-amber-700 px-4 py-2 text-white disabled:opacity-50"
                      >
                        {busyId === o.id ? 'Đang xử lý...' : next.label}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <IngredientTable />
    </main>
  );
}