
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { useCartStore, type CartItem } from "@/store/cart-store";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);

const lineKey = (item: CartItem) =>
  `${item.productId}-${item.size}-${[...item.toppingIds]
    .sort((a, b) => a - b)
    .join("|")}`;

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clear = useCartStore((state) => state.clear);
  const totalPrice = useCartStore((state) => state.totalPrice());
   // Số ly tối đa của từng dòng (key = lineKey), lấy từ API kho nguyên liệu
  const [maxByKey, setMaxByKey] = useState<Record<string, number>>({});

  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;

    Promise.all(
      items.map(async (item) => {
        const key = lineKey(item);
        // Các dòng KHÁC trong giỏ (dùng chung nguyên liệu)
        const others = items
          .filter((other) => lineKey(other) !== key)
          .map((other) => ({
            productId: other.productId,
            size: other.size,
            toppingIds: other.toppingIds,
            quantity: other.quantity,
          }));
        try {
          const res = await apiFetch<{ maxQuantity: number }>(
            "/products/availability",
            {
              method: "POST",
              body: JSON.stringify({
                items: others,
                add: {
                  productId: item.productId,
                  size: item.size,
                  toppingIds: item.toppingIds,
                },
              }),
            }
          );
          return [key, res.maxQuantity] as const;
        } catch {
          // Lỗi mạng: không chặn khách, backend vẫn kiểm tra lúc tạo đơn
          return null;
        }
      })
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, number> = {};
      for (const r of results) {
        if (r) next[r[0]] = r[1];
      }
      setMaxByKey(next);
    });

    return () => {
      cancelled = true;
    };
  }, [items]);

  // undefined = chưa biết (đang tải hoặc lỗi) → không khoá
  const maxOf = (item: CartItem): number | undefined =>
    maxByKey[lineKey(item)];
  const isOver = (item: CartItem) => {
    const max = maxOf(item);
    return max !== undefined && item.quantity > max;
  };
  const overLimit = items.some(isOver);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 text-stone-800">
      <div className="mb-8">
        <Link href="/" className="text-sm text-stone-500 hover:text-amber-700">
          ← Tiếp tục mua hàng
        </Link>
        <h1 className="mt-3 text-3xl font-bold">Giỏ hàng của bạn</h1>
        <p className="mt-2 text-stone-500">
          Kiểm tra sản phẩm trước khi thanh toán.
        </p>
      </div>

      {items.length === 0 ? (
        <section className="rounded-2xl border border-stone-200 p-10 text-center">
          <div className="text-5xl">🛒</div>
          <h2 className="mt-4 text-xl font-semibold">
            Giỏ hàng đang trống
          </h2>
          <p className="mt-2 text-stone-500">
            Hãy chọn món đồ uống yêu thích của bạn.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-amber-800 px-6 py-3 font-medium text-white hover:bg-amber-900"
          >
            Khám phá menu
          </Link>
        </section>
      ) : (
        <div className="grid gap-8 md:grid-cols-[1fr_320px]">
          <section className="space-y-4">
            {items.map((item) => (
                            <article
                key={lineKey(item)}
                className={`flex gap-4 rounded-2xl border p-4 ${
                  isOver(item)
                    ? "border-red-300 bg-red-50"
                    : "border-stone-200"
                }`}
              >
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-stone-100">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl">☕</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">{item.name}</h2>
                  <p className="mt-1 text-sm text-stone-500">
                    Size {item.size}
                    {item.toppings.length > 0
                      ? ` · ${item.toppings.join(", ")}`
                      : ""}
                  </p>
                  <p className="mt-2 font-medium text-amber-900">
                    {formatPrice(item.unitPrice)}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="flex items-center rounded-lg border border-stone-300">
                      <button
                        type="button"
                        aria-label={`Giảm số lượng ${item.name}`}
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.size,
                            item.toppingIds,
                            item.quantity - 1
                          )
                        }
                        className="px-3 py-1.5 hover:bg-stone-100"
                      >
                        −
                      </button>
                      <span className="min-w-8 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Tăng số lượng ${item.name}`}
                        disabled={
                          maxOf(item) !== undefined &&
                          item.quantity >= (maxOf(item) as number)
                        }
                            onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.size,
                            item.toppingIds,
                            item.quantity + 1
                          )
                        }
                        className="px-3 py-1.5 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeItem(
                          item.productId,
                          item.size,
                          item.toppingIds
                        )
                      }
                      className="text-sm text-red-600 hover:underline"
                    >
                      Xóa
                    </button>
                  </div>
                                          {maxOf(item) !== undefined &&
                    item.quantity >= (maxOf(item) as number) && (
                      <p
                        className={`mt-1 text-xs ${
                          isOver(item) ? "text-red-700" : "text-amber-700"
                        }`}
                      >
                        Chỉ còn pha được {maxOf(item)} ly
                      </p>
                    )}
                </div>

                <p className="whitespace-nowrap text-sm font-semibold">
                  {formatPrice(item.unitPrice * item.quantity)}
                </p>
              </article>
            ))}

            <button
              type="button"
              onClick={clear}
              className="text-sm text-red-600 hover:underline"
            >
              Xóa toàn bộ giỏ hàng
            </button>
          </section>

          <aside className="h-fit rounded-2xl border border-stone-200 p-5">
            <h2 className="text-xl font-bold">Tóm tắt đơn hàng</h2>

            <div className="mt-5 flex justify-between gap-4 text-sm">
              <span className="text-stone-500">
                Tạm tính ({items.reduce((sum, item) => sum + item.quantity, 0)} món)
              </span>
              <span>{formatPrice(totalPrice)}</span>
            </div>

            <div className="mt-3 flex justify-between gap-4 text-sm">
              <span className="text-stone-500">Giảm giá</span>
              <span>{formatPrice(0)}</span>
            </div>

            <div className="my-5 border-t border-stone-200" />

            <div className="flex justify-between gap-4 text-lg font-bold">
              <span>Tổng cộng</span>
              <span className="text-amber-900">{formatPrice(totalPrice)}</span>
            </div>

                        {overLimit ? (
              <>
                <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  Giỏ vượt quá nguyên liệu còn lại (các món dùng chung nguyên
                  liệu). Hãy giảm số lượng hoặc bỏ bớt món được tô đỏ.
                </p>
                <span className="mt-3 block cursor-not-allowed rounded-xl bg-stone-300 px-4 py-3 text-center font-semibold text-white">
                  Tiến hành thanh toán
                </span>
              </>
            ) : (
              <Link
                href="/checkout"
                className="mt-6 block rounded-xl bg-amber-800 px-4 py-3 text-center font-semibold text-white hover:bg-amber-900"
              >
                Tiến hành thanh toán
              </Link>
            )}

            <p className="mt-3 text-center text-xs text-stone-500">
              Mã giảm giá và điểm tích lũy sẽ được xử lý ở bước tiếp theo.
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
