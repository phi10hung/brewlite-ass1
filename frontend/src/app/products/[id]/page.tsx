'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';

type Size = 'S' | 'M' | 'L';
type Topping = { id: number; name: string; price: number };
type ProductDetail = {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
  sizes: { size: Size; extra: number }[];
  toppings: Topping[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function formatVnd(amount: number) {
  return amount.toLocaleString('vi-VN') + 'đ';
}

function getIcon(name: string, category: string) {
  const n = name.toLowerCase();
  if (n.includes('matcha')) return '🍵';
  if (n.includes('trà sữa')) return '🧋';
  if (n.includes('đào')) return '🍑';
  if (n.includes('dâu')) return '🍓';
  if (n.includes('cookie')) return '🍪';
  if (n.includes('bơ')) return '🥑';
  if (n.includes('chocolate')) return '🍫';
  if (n.includes('cappuccino')) return '☕';
  if (n.includes('latte') || n.includes('bạc xỉu')) return '🥛';
  if (n.includes('nho')) return '🍇';
  if (n.includes('xoài')) return '🥭';
  if (category === 'Cà phê') return '☕';
  if (category === 'Trà') return '🍹';
  if (category === 'Đá xay') return '🥤';
  return '🧋';
}

class NotFoundError extends Error {}

type Status = 'loading' | 'ready' | 'notfound' | 'error';

async function fetchProduct(id: string): Promise<ProductDetail> {
  const res = await fetch(`${API_URL}/products/${id}`);
  if (res.status === 404) throw new NotFoundError();
  if (!res.ok) throw new Error('fetch-failed');
  return res.json();
}

function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [size, setSize] = useState<Size>('S');
  const [toppingIds, setToppingIds] = useState<number[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [addMessage, setAddMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    let cancelled = false;
    fetchProduct(id)
      .then((p) => {
        if (cancelled) return;
        setProduct(p);
        setStatus('ready');
      })
      .catch((e) => {
        if (cancelled) return;
        setStatus(e instanceof NotFoundError ? 'notfound' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  if (status === 'loading') {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <p className="text-gray-500">Đang tải món...</p>
      </main>
    );
  }

  if (status === 'notfound') {
    return (
      <main className="mx-auto max-w-2xl p-4 text-center">
        <p className="mt-10 text-lg font-semibold">Không tìm thấy món này</p>
        <Link href="/" className="mt-3 inline-block text-amber-700 underline">
          ← Về Menu
        </Link>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="mx-auto max-w-2xl p-4 text-center">
        <p className="mt-10 text-lg font-semibold">Không tải được dữ liệu</p>
        <button
          onClick={() => {
            setStatus('loading');
            setReloadKey((k) => k + 1);
          }}
          className="mt-3 rounded bg-amber-700 px-4 py-2 text-white"
        >
          Thử lại
        </button>
      </main>
    );
  }

  if (!product) return null;

  const sizeExtra = product.sizes.find((s) => s.size === size)?.extra ?? 0;
  const toppingsTotal = product.toppings
    .filter((t) => toppingIds.includes(t.id))
    .reduce((sum, t) => sum + t.price, 0);
  const unitPrice = product.price + sizeExtra + toppingsTotal;
  const total = unitPrice * quantity;

  const toggleTopping = (tid: number) =>
    setToppingIds((prev) => (prev.includes(tid) ? prev.filter((x) => x !== tid) : [...prev, tid]));

  const handleAdd = async () => {
    setAdding(true);
    setAddMessage(null);
    try {
      addItem({
                productId: product.id,
                name: product.name,
                imageUrl: product.imageUrl,
                size,
                toppingIds,
                toppings: product.toppings
                  .filter((t) => toppingIds.includes(t.id))
                  .map((t) => t.name),
                unitPrice,
                quantity,
      });
      setAddMessage({ type: 'ok', text: 'Đã thêm vào giỏ hàng' });
    } catch {
      setAddMessage({ type: 'error', text: 'Không thêm được vào giỏ, thử lại nhé' });
    } finally {
      setAdding(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl p-4">
      <Link href="/" className="text-sm text-amber-700 underline">
        ← Về Menu
      </Link>

      <div className="mt-3">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="mx-auto aspect-square w-full max-w-md rounded-lg object-cover" />
        ) : (
          <div className="mx-auto flex aspect-square w-full max-w-md items-center justify-center rounded-lg bg-amber-50 text-7xl">
            {getIcon(product.name, product.category)}
          </div>
        )}
      </div>

      <h1 className="mt-4 text-2xl font-bold">{product.name}</h1>
      <p className="text-gray-600">{product.description}</p>
      <p className="mt-1 text-lg text-amber-700">{formatVnd(product.price)}</p>

      <section className="mt-5">
        <h2 className="mb-2 font-semibold">Kích cỡ</h2>
        <div className="flex gap-2">
          {product.sizes.map((s) => (
            <button
              key={s.size}
              onClick={() => setSize(s.size)}
              className={`rounded border px-4 py-2 ${
                size === s.size ? 'bg-amber-700 text-white' : 'bg-white'
              }`}
            >
              {s.size}
              {s.extra > 0 && <span className="ml-1 text-xs">+{formatVnd(s.extra)}</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h2 className="mb-2 font-semibold">Topping</h2>
        <div className="space-y-2">
          {product.toppings.map((t) => (
            <label key={t.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={toppingIds.includes(t.id)}
                onChange={() => toggleTopping(t.id)}
              />
              <span>
                {t.name} (+{formatVnd(t.price)})
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="mt-5 flex items-center gap-3">
        <h2 className="font-semibold">Số lượng</h2>
        <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="h-8 w-8 rounded border">
          −
        </button>
        <span className="w-6 text-center">{quantity}</span>
        <button onClick={() => setQuantity((q) => q + 1)} className="h-8 w-8 rounded border">
          +
        </button>
      </section>

      <p className="mt-6 text-xl font-semibold">
        Tổng: <span className="text-amber-700">{formatVnd(total)}</span>
      </p>

      <button
        onClick={handleAdd}
        disabled={adding}
        className="mt-4 w-full rounded bg-amber-700 py-3 font-semibold text-white disabled:opacity-60"
      >
        {adding ? 'Đang thêm...' : 'Thêm vào giỏ'}
      </button>
      {addMessage && (
        <p
          role="status"
          className={`mt-2 text-center ${addMessage.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}
        >
          {addMessage.text}
        </p>
      )}
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