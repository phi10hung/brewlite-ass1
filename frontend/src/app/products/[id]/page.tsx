'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type ProductDetail = {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
};

// true = dùng dữ liệu giả; đổi thành false khi API của Quang chạy được
const USE_MOCK = true;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const MOCK_BASE: Record<number, { name: string; category: string; price: number }> = {
  1: { name: 'Latte', category: 'Cà phê', price: 49000 },
  2: { name: 'Cà phê sữa', category: 'Cà phê', price: 29000 },
  3: { name: 'Trà đào', category: 'Trà', price: 39000 },
  4: { name: 'Trà dâu', category: 'Trà', price: 39000 },
  5: { name: 'Cookie đá xay', category: 'Đá xay', price: 55000 },
};

function formatVnd(amount: number) {
  return amount.toLocaleString('vi-VN') + 'đ';
}

function getIcon(name: string, category: string) {
  const n = name.toLowerCase();
  if (n.includes('đào')) return '🍑';
  if (n.includes('dâu')) return '🍓';
  if (n.includes('cookie')) return '🍪';
  if (n.includes('latte')) return '🥛';
  if (category === 'Cà phê') return '☕';
  if (category === 'Trà') return '🍵';
  if (category === 'Đá xay') return '🥤';
  return '🧋';
}

async function fetchProduct(id: string): Promise<ProductDetail> {
  if (USE_MOCK) {
    const base = MOCK_BASE[Number(id)];
    return {
      id: Number(id),
      ...base,
      description: 'Món mẫu để xem trước giao diện. Dữ liệu thật sẽ lấy từ API.',
      imageUrl: '',
    };
  }
  const res = await fetch(`${API_URL}/products/${id}`);
  return res.json();
}

function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);

  useEffect(() => {
    fetchProduct(id).then(setProduct);
  }, [id]);

  if (!product) return null;

  return (
    <main className="mx-auto max-w-2xl p-4">
      <Link href="/" className="text-sm text-amber-700 underline">
        ← Về Menu
      </Link>

      <div className="mt-3">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="aspect-video w-full rounded-lg object-cover" />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-amber-50 text-7xl">
            {getIcon(product.name, product.category)}
          </div>
        )}
      </div>

      <h1 className="mt-4 text-2xl font-bold">{product.name}</h1>
      <p className="text-gray-600">{product.description}</p>
      <p className="mt-1 text-lg text-amber-700">{formatVnd(product.price)}</p>
    </main>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={null}>
      <ProductDetail />
    </Suspense>
  );
}