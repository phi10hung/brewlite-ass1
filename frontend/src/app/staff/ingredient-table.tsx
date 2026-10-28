'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Ingredient = {
  id: number;
  name: string;
  unit: string;
  stock: number;
};

export default function IngredientTable() {
  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Ingredient[]>('/staff/ingredients')
      .then((data) => {
        if (cancelled) return;
        setItems(data);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Có lỗi xảy ra');
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

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold">Kho nguyên liệu</h2>
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
                <th className="px-4 py-2">Tên</th>
                <th className="px-4 py-2 text-right">Tồn kho</th>
                <th className="px-4 py-2">Đơn vị</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr
                  key={i.id}
                  className={`border-t ${i.stock === 0 ? 'bg-red-50 text-red-600' : ''}`}
                >
                  <td className="px-4 py-2">{i.name}</td>
                  <td className="px-4 py-2 text-right">{i.stock.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-2">{i.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}