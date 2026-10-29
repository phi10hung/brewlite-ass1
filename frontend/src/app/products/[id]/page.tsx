'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';

type Size = 'S' | 'M' | 'L';
type Availability = Record<Size, number>;
type Topping = { id: number; name: string; price: number; available?: boolean };
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

// Gọi availability cho cả 3 size cùng lúc, giỏ rỗng (trang chi tiết chỉ nhìn kho thật)
async function fetchAvailability(productId: number, toppingIds: number[]): Promise<Availability> {
  const sizes: Size[] = ['S', 'M', 'L'];
  const results = await Promise.all(
    sizes.map(async (s) => {
      const res = await fetch(`${API_URL}/products/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [], add: { productId, size: s, toppingIds } }),
      });
      if (!res.ok) throw new Error('availability-failed');
      const data = (await res.json()) as { maxQuantity: number };
      return data.maxQuantity;
    }),
  );
  return { S: results[0], M: results[1], L: results[2] };
}

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
  const [availability, setAvailability] = useState<Availability | null>(null);

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

  // Lấy số ly còn pha được lúc mở trang và mỗi lần đổi topping
  const productId = product?.id;
  useEffect(() => {
    if (productId === undefined) return;
    let cancelled = false;
    fetchAvailability(productId, toppingIds)
      .then((a) => {
        if (!cancelled) setAvailability(a);
      })
      .catch(() => {
        if (!cancelled) setAvailability(null);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, toppingIds]);

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
  // Số ly còn pha được của size đang chọn (null = chưa có số liệu)
  const maxQty = availability ? availability[size] : null;
  // Size nào hết nguyên liệu với topping đang chọn
  const sizeSoldOut = (s: Size) => availability !== null && availability[s] === 0;
  // Cả 3 size đều bằng 0 thì coi như hết món
  const soldOutAll =
    availability !== null && availability.S === 0 && availability.M === 0 && availability.L === 0;

  const toggleTopping = (tid: number) => {
    setAddMessage(null);
    setToppingIds((prev) => (prev.includes(tid) ? prev.filter((x) => x !== tid) : [...prev, tid]));
  };

  const handleAdd = async () => {
    if (maxQty !== null && quantity > maxQty) {
      setAddMessage({ type: 'error', text: `Chỉ còn pha được ${maxQty} ly với lựa chọn này` });
      return;
    }
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
              onClick={() => {
                setSize(s.size);
                setAddMessage(null);
              }}
              disabled={sizeSoldOut(s.size)}
              className={`rounded border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                size === s.size ? 'bg-amber-700 text-white' : 'bg-white'
              }`}
            >
              {s.size}
              {sizeSoldOut(s.size) && <span className="ml-1 text-xs">(hết)</span>}
              {s.extra > 0 && <span className="ml-1 text-xs">+{formatVnd(s.extra)}</span>}
            </button>
          ))}
        </div>
        {soldOutAll ? (
          <p className="mt-2 text-sm font-semibold text-red-600">Hết món</p>
        ) : (
          maxQty === 0 && (
            <p className="mt-2 text-sm text-red-600">
              Size {size} không đủ nguyên liệu với topping đã chọn
            </p>
          )
        )}
      </section>

      <section className="mt-5">
        <h2 className="mb-2 font-semibold">Topping</h2>
        <div className="space-y-2">
          {product.toppings.map((t) => {
            const soldOut = t.available === false;
            return (
              <label
                key={t.id}
                className={`flex items-center gap-2 ${soldOut ? 'text-gray-400' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={toppingIds.includes(t.id)}
                  onChange={() => toggleTopping(t.id)}
                  disabled={soldOut}
                />
                <span>
                  {t.name} (+{formatVnd(t.price)})
                  {soldOut && <span className="ml-1 text-xs">(hết)</span>}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="mt-5 flex items-center gap-3">
        <h2 className="font-semibold">Số lượng</h2>
        <button onClick={() => {
            setQuantity((q) => Math.max(1, q - 1));
            setAddMessage(null);
          }} className="h-8 w-8 rounded border">
          −
        </button>
        <span className="w-6 text-center">{quantity}</span>
        <button
          onClick={() => {
            setQuantity((q) => (maxQty === null ? q + 1 : Math.max(1, Math.min(maxQty, q + 1))));
            setAddMessage(null);
          }}
          className="h-8 w-8 rounded border"
        >
          +
        </button>
      </section>
      {maxQty !== null && <p className="mt-2 text-sm text-stone-500">Còn {maxQty} ly</p>}

      <p className="mt-6 text-xl font-semibold">
        Tổng: <span className="text-amber-700">{formatVnd(total)}</span>
      </p>

      <button
        onClick={handleAdd}
        disabled={adding || soldOutAll || maxQty === 0}
        className="mt-4 w-full rounded bg-amber-700 py-3 font-semibold text-white disabled:opacity-60"
      >
        {soldOutAll ? 'Hết món' : adding ? 'Đang thêm...' : 'Thêm vào giỏ'}
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