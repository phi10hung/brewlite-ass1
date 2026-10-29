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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function formatVnd(amount: number) {
  return amount.toLocaleString('vi-VN') + 'đ';
}

function getIcon(p: Product) {
  const name = p.name.toLowerCase();
  if (name.includes('matcha')) return '🍵';
  if (name.includes('trà sữa')) return '🧋';
  if (name.includes('đào')) return '🍑';
  if (name.includes('dâu')) return '🍓';
  if (name.includes('cookie')) return '🍪';
  if (name.includes('bơ')) return '🥑';
  if (name.includes('chocolate')) return '🍫';
  if (name.includes('cappuccino')) return '☕';
  if (name.includes('latte') || name.includes('bạc xỉu')) return '🥛';
  if (name.includes('nho')) return '🍇';
  if (name.includes('xoài')) return '🥭';
  if (p.category === 'Cà phê') return '☕';
  if (p.category === 'Trà') return '🍹';
  if (p.category === 'Đá xay') return '🥤';
  return '🧋';
}

async function fetchProducts(): Promise<Product[]> {
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
  const [category, setCategory] = useState('Tất cả');
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

  const categories = ['Tất cả', ...Array.from(new Set(products.map((p) => p.category)))];
  const shown = category === 'Tất cả' ? products : products.filter((p) => p.category === category);

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
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  category === c ? 'bg-amber-700 text-white' : 'bg-white text-gray-700'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {shown.map((p) => {
              const soldOut = p.stock === 0;
              return (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className={`overflow-hidden rounded-lg border bg-white shadow-sm hover:shadow-md ${
                    soldOut ? 'opacity-60' : ''
                  }`}
                >
                  <div className="relative">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} className="aspect-square w-full object-cover" />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center bg-amber-50 text-4xl">
                        {getIcon(p)}
                      </div>
                    )}
                    {soldOut && (
                      <span className="absolute left-2 top-2 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white">
                        Hết món
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h2 className="font-semibold">{p.name}</h2>
                    <p className="text-amber-700">{formatVnd(p.price)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}