'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Ingredient = {
  id: number;
  name: string;
  unit: string;
  stock: number;
};

type RowMessage = { type: 'ok' | 'error'; text: string };

// Khớp giới hạn của API nhập kho
const MAX_RESTOCK = 1_000_000;

// Kiểm tra số nhập trước khi gọi API: sai thì trả câu báo, đúng thì trả null
function validateAmount(value: string): string | null {
  if (!/^\d+$/.test(value)) return 'Nhập số nguyên dương';
  const amount = Number(value);
  if (amount < 1) return 'Số lượng phải lớn hơn 0';
  if (amount > MAX_RESTOCK) return 'Tối đa 1.000.000';
  return null;
}

export default function IngredientTable() {
  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [messages, setMessages] = useState<Record<number, RowMessage>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Ingredient[]>('/staff/ingredients')
      .then((data) => {
        if (cancelled) return;
        setItems(data);
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
    setMessages({});
    setReloadKey((k) => k + 1);
  };

  const changeAmount = (id: number, value: string) => {
    setAmounts((prev) => ({ ...prev, [id]: value }));
    setMessages((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const restock = (item: Ingredient) => {
    const value = (amounts[item.id] ?? '').trim();
    const invalid = validateAmount(value);
    if (invalid) {
      setMessages((prev) => ({ ...prev, [item.id]: { type: 'error', text: invalid } }));
      return;
    }

    const amount = Number(value);
    setBusyId(item.id);
    apiFetch<Ingredient>(`/staff/ingredients/${item.id}/restock`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    })
      .then((updated) => {
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        setAmounts((prev) => ({ ...prev, [item.id]: '' }));
        setMessages((prev) => ({
          ...prev,
          [item.id]: {
            type: 'ok',
            text: `Đã nhập ${amount.toLocaleString('vi-VN')} ${item.unit}`,
          },
        }));
      })
      .catch((e) => {
        setMessages((prev) => ({
          ...prev,
          [item.id]: {
            type: 'error',
            text: e instanceof Error ? e.message : 'Không nhập được kho',
          },
        }));
      })
      .finally(() => setBusyId(null));
  };

  if (forbidden) {
    return <p className="py-10 text-center text-red-600">Bạn không có quyền xem trang này</p>;
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kho nguyên liệu</h1>
        <button
          onClick={reload}
          disabled={loading}
          className="rounded border border-amber-700 px-3 py-1 text-sm text-amber-700 disabled:opacity-50"
        >
          Tải lại
        </button>
      </div>

      {loading && <p className="py-6 text-center text-gray-500">Đang tải...</p>}

      {!loading && error && <p className="py-6 text-center text-red-600">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="py-6 text-center text-gray-500">Chưa có nguyên liệu nào</p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-amber-50 text-gray-700">
              <tr>
                <th className="px-2 py-2 sm:px-4">Tên</th>
                <th className="px-2 py-2 sm:px-4 text-right">Tồn kho</th>
                <th className="px-2 py-2 sm:px-4">Đơn vị</th>
                <th className="px-2 py-2 sm:px-4">Nhập kho</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const message = messages[i.id];
                return (
                  <tr
                    key={i.id}
                    className={`border-t ${i.stock === 0 ? 'bg-red-50 text-red-600' : ''}`}
                  >
                    <td className="px-2 py-2 sm:px-4">{i.name}</td>
                    <td className="px-2 py-2 sm:px-4 text-right">{i.stock.toLocaleString('vi-VN')}</td>
                    <td className="px-2 py-2 sm:px-4">{i.unit}</td>
                    <td className="px-2 py-2 sm:px-4">
                      <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          aria-label={`Số lượng nhập ${i.name}`}
                          placeholder={i.unit}
                          value={amounts[i.id] ?? ''}
                          onChange={(e) => changeAmount(i.id, e.target.value)}
                          className="w-20 rounded border px-2 py-1 text-gray-900 sm:w-24"
                        />
                        <button
                          onClick={() => restock(i)}
                          disabled={busyId === i.id}
                          className="w-20 whitespace-nowrap rounded bg-amber-700 px-1 py-1 text-white disabled:opacity-50 sm:w-auto sm:px-3"
                        >
                          {busyId === i.id ? 'Đang nhập...' : 'Nhập kho'}
                        </button>
                      </div>
                      {message && (
                        <p
                          className={`mt-1 text-xs ${
                            message.type === 'ok' ? 'text-green-700' : 'text-red-600'
                          }`}
                        >
                          {message.text}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
