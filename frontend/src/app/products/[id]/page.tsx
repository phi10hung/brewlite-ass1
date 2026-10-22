'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

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

// true = dùng dữ liệu giả; đổi thành false khi API của Quang chạy được
const USE_MOCK = true;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const MOCK_BASE: Record<
  number,
  { name: string; category: string; price: number; description: string }
> = {
  1: { name: 'Cà phê sữa đá', category: 'Cà phê', price: 29000, description: 'Cà phê phin đậm đà pha cùng sữa đặc, uống kèm đá.' },
  2: { name: 'Cà phê đen đá', category: 'Cà phê', price: 25000, description: 'Cà phê phin nguyên chất, vị đắng đậm.' },
  3: { name: 'Bạc xỉu', category: 'Cà phê', price: 32000, description: 'Nhiều sữa, ít cà phê, ngọt dịu.' },
  4: { name: 'Cappuccino', category: 'Cà phê', price: 45000, description: 'Espresso với lớp bọt sữa mịn.' },
  5: { name: 'Latte', category: 'Cà phê', price: 45000, description: 'Espresso pha nhiều sữa tươi nóng.' },
  6: { name: 'Trà đào cam sả', category: 'Trà', price: 39000, description: 'Trà đen, đào miếng, cam và sả thơm mát.' },
  7: { name: 'Trà sữa trân châu', category: 'Trà', price: 35000, description: 'Trà sữa đậm vị kèm trân châu đường đen.' },
  8: { name: 'Matcha latte', category: 'Trà', price: 49000, description: 'Bột matcha Nhật pha sữa tươi.' },
  9: { name: 'Sinh tố bơ', category: 'Đá xay', price: 45000, description: 'Bơ sáp xay cùng sữa đặc.' },
  10: { name: 'Chocolate đá xay', category: 'Đá xay', price: 49000, description: 'Chocolate xay đá, phủ kem tươi.' },
  // Món thêm tạm của Búp, chưa có trong seed của Hùng
  11: { name: 'Trà dâu', category: 'Trà', price: 39000, description: 'Trà đen, mứt dâu tươi mát, kèm dâu tươi.' },
  12: { name: 'Trà nho', category: 'Trà', price: 39000, description: 'Trà đen, mứt nho tươi mát, kèm nho tươi.' },
  13: { name: 'Trà xoài', category: 'Trà', price: 39000, description: 'Trà đen, mứt xoài tươi mát, kèm xoài tươi miếng.' },
  14: { name: 'Cookie đá xay', category: 'Đá xay', price: 55000, description: 'Đá xay béo ngậy với bánh cookie, phủ kem tươi.' },
};

const MOCK_SIZES: ProductDetail['sizes'] = [
  { size: 'S', extra: 0 },
  { size: 'M', extra: 5000 },
  { size: 'L', extra: 10000 },
];

const MOCK_TOPPINGS: Topping[] = [
  { id: 1, name: 'Trân châu đen', price: 8000 },
  { id: 2, name: 'Thạch cà phê', price: 8000 },
  { id: 3, name: 'Kem cheese', price: 12000 },
  { id: 4, name: 'Thêm 1 shot espresso', price: 10000 },
  // Topping thêm tạm của Búp, chưa có trong seed của Hùng
  { id: 5, name: 'Trân châu trắng', price: 5000 },
  { id: 6, name: 'Pudding', price: 10000 },
  { id: 7, name: 'Thạch trái cây', price: 8000 },
  { id: 8, name: 'Bánh flan', price: 12000 },
  { id: 9, name: 'Thạch phô mai', price: 12000 },
];

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

async function fetchProduct(id: string): Promise<ProductDetail> {
  if (USE_MOCK) {
    const base = MOCK_BASE[Number(id)];
    return {
      id: Number(id),
      ...base,
      imageUrl: '',
      sizes: MOCK_SIZES,
      toppings: MOCK_TOPPINGS,
    };
  }
  const res = await fetch(`${API_URL}/products/${id}`);
  return res.json();
}

function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [size, setSize] = useState<Size>('S');
  const [toppingIds, setToppingIds] = useState<number[]>([]);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchProduct(id).then(setProduct);
  }, [id]);

  if (!product) return null;

  const sizeExtra = product.sizes.find((s) => s.size === size)?.extra ?? 0;
  const toppingsTotal = product.toppings
    .filter((t) => toppingIds.includes(t.id))
    .reduce((sum, t) => sum + t.price, 0);
  const unitPrice = product.price + sizeExtra + toppingsTotal;
  const total = unitPrice * quantity;

  const toggleTopping = (tid: number) =>
    setToppingIds((prev) => (prev.includes(tid) ? prev.filter((x) => x !== tid) : [...prev, tid]));

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
        <button onClick={() => setQuantity((q) => Math.min(20, q + 1))} className="h-8 w-8 rounded border">
          +
        </button>
      </section>

      <p className="mt-6 text-xl font-semibold">
        Tổng: <span className="text-amber-700">{formatVnd(total)}</span>
      </p>
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