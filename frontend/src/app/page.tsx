'use client';

import Link from 'next/link';

type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
};

const MOCK_PRODUCTS: Product[] = [
  { id: 1, name: 'Latte', category: 'Cà phê', price: 49000 },
  { id: 2, name: 'Cà phê sữa', category: 'Cà phê', price: 29000 },
  { id: 3, name: 'Trà đào', category: 'Trà', price: 39000 },
  { id: 4, name: 'Trà dâu', category: 'Trà', price: 39000 },
  { id: 5, name: 'Cookie đá xay', category: 'Đá xay', price: 55000 },
];

function formatVnd(amount: number) {
  return amount.toLocaleString('vi-VN') + 'đ';
}

export default function MenuPage() {
  return (
    <main className="mx-auto max-w-6xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Thực đơn</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {MOCK_PRODUCTS.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            className="overflow-hidden rounded-lg border bg-white shadow-sm hover:shadow-md"
          >
            <div className="flex aspect-square w-full items-center justify-center bg-amber-50 text-4xl">
              ☕
            </div>
            <div className="p-3">
              <h2 className="font-semibold">{p.name}</h2>
              <p className="text-amber-700">{formatVnd(p.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}