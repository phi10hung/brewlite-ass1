'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Product = {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
  stock: number;
};

// true = dùng dữ liệu giả; đổi thành false khi API của Quang chạy được
const USE_MOCK = true;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const MOCK_PRODUCTS: Product[] = [
  { id: 1, name: 'Latte', description: '', category: 'Cà phê', price: 49000, imageUrl: '', stock: 50 },
  { id: 2, name: 'Cà phê sữa', description: '', category: 'Cà phê', price: 29000, imageUrl: '', stock: 50 },
  { id: 3, name: 'Trà đào', description: '', category: 'Trà', price: 39000, imageUrl: '', stock: 50 },
  { id: 4, name: 'Trà dâu', description: '', category: 'Trà', price: 39000, imageUrl: '', stock: 50 },
  { id: 5, name: 'Cookie đá xay', description: '', category: 'Đá xay', price: 55000, imageUrl: '', stock: 50 },
];

function formatVnd(amount: number) {
  return amount.toLocaleString('vi-VN') + 'đ';
}

async function fetchProducts(): Promise<Product[]> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return MOCK_PRODUCTS;
  }
  const res = await fetch(`${API_URL}/products`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'Không tải được danh sách món');
  }
  return res.json();
}

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchProducts()
      .then((data) => {
        if (!cancelled) setProducts(data);
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

  const retry = () => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  };

  return (
    <main className="mx-auto max-w-6xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Thực đơn</h1>

      {loading && <p className="py-10 text-center text-gray-500">Đang tải...</p>}

      {!loading && error && (
        <div className="py-10 text-center">
          <p className="mb-3 text-red-600">{error}</p>
          <button onClick={retry} className="rounded bg-amber-700 px-4 py-2 text-white">
            Thử lại
          </button>
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <p className="py-10 text-center text-gray-500">Chưa có món nào</p>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className="overflow-hidden rounded-lg border bg-white shadow-sm hover:shadow-md"
            >
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt={p.name} className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-amber-50 text-4xl">
                  ☕
                </div>
              )}
              <div className="p-3">
                <h2 className="font-semibold">{p.name}</h2>
                <p className="text-amber-700">{formatVnd(p.price)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}