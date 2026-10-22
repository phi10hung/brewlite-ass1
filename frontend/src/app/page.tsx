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
  { id: 1, name: 'Cà phê sữa đá', description: 'Cà phê phin đậm đà pha cùng sữa đặc, uống kèm đá.', category: 'Cà phê', price: 29000, imageUrl: '', stock: 50 },
  { id: 2, name: 'Cà phê đen đá', description: 'Cà phê phin nguyên chất, vị đắng đậm.', category: 'Cà phê', price: 25000, imageUrl: '', stock: 50 },
  { id: 3, name: 'Bạc xỉu', description: 'Nhiều sữa, ít cà phê, ngọt dịu.', category: 'Cà phê', price: 32000, imageUrl: '', stock: 50 },
  { id: 4, name: 'Cappuccino', description: 'Espresso với lớp bọt sữa mịn.', category: 'Cà phê', price: 45000, imageUrl: '', stock: 50 },
  { id: 5, name: 'Latte', description: 'Espresso pha nhiều sữa tươi nóng.', category: 'Cà phê', price: 45000, imageUrl: '', stock: 50 },
  { id: 6, name: 'Trà đào cam sả', description: 'Trà đen, đào miếng, cam và sả thơm mát.', category: 'Trà', price: 39000, imageUrl: '', stock: 50 },
  { id: 7, name: 'Trà sữa trân châu', description: 'Trà sữa đậm vị kèm trân châu đường đen.', category: 'Trà', price: 35000, imageUrl: '', stock: 50 },
  { id: 8, name: 'Matcha latte', description: 'Bột matcha Nhật pha sữa tươi.', category: 'Trà', price: 49000, imageUrl: '', stock: 50 },
  { id: 9, name: 'Sinh tố bơ', description: 'Bơ sáp xay cùng sữa đặc.', category: 'Đá xay', price: 45000, imageUrl: '', stock: 50 },
  { id: 10, name: 'Chocolate đá xay', description: 'Chocolate xay đá, phủ kem tươi.', category: 'Đá xay', price: 49000, imageUrl: '', stock: 50 },
    // Món thêm tạm của Búp, chưa có trong seed của Hùng
  { id: 11, name: 'Trà dâu', description: 'Trà đen, mứt dâu tươi mát, kèm dâu tươi.', category: 'Trà', price: 39000, imageUrl: '', stock: 50 },
  { id: 12, name: 'Trà nho', description: 'Trà đen, mứt nho tươi mát, kèm nho tươi.', category: 'Trà', price: 39000, imageUrl: '', stock: 50 },
  { id: 13, name: 'Trà xoài', description: 'Trà đen, mứt xoài tươi mát, kèm xoài tươi miếng.', category: 'Trà', price: 39000, imageUrl: '', stock: 50 },
  { id: 14, name: 'Cookie đá xay', description: 'Đá xay béo ngậy với bánh cookie, phủ kem tươi.', category: 'Đá xay', price: 55000, imageUrl: '', stock: 50 },
];

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
            {shown.map((p) => (
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
                    {getIcon(p)}
                  </div>
                )}
                <div className="p-3">
                  <h2 className="font-semibold">{p.name}</h2>
                  <p className="text-amber-700">{formatVnd(p.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}