"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatVnd } from "@/lib/format";
import type { Product } from "@/lib/types";

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("Tất cả");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiFetch<Product[]>("/products");
      setProducts(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi khi tải menu."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const categories = ["Tất cả", "Cà phê", "Trà", "Đá xay"];

  const filteredProducts =
    category === "Tất cả"
      ? products
      : products.filter(
          (p) => p.category === category
        );

  return (
    <div className="mx-auto min-h-[60vh] max-w-7xl
      px-4 py-8 sm:px-6 sm:py-12">

      <section className="mb-8 rounded-2xl bg-amber-950
        px-5 py-8 text-white sm:px-10 sm:py-12">
        <p className="text-sm font-medium text-amber-200">
          CHÀO MỪNG ĐẾN BREWLITE
        </p>
        <h1 className="mt-2 text-3xl font-bold sm:text-5xl">
          Một chút cà phê,
          <br />
          thêm nhiều niềm vui.
        </h1>
        <p className="mt-3 max-w-lg text-sm text-amber-100 sm:text-base">
          Khám phá những thức uống yêu thích của bạn.
        </p>
      </section>

      <div className="mb-6 flex flex-wrap items-center
        justify-between gap-3">
        <h2 className="text-2xl font-bold text-stone-900">
          Menu đồ uống
        </h2>

        <div className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`rounded-full px-3 py-2 text-sm
                transition ${
                  category === item
                    ? "bg-amber-900 text-white"
                    : "bg-white text-stone-700 ring-1 ring-stone-200"
                }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4
          md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden
                rounded-2xl bg-white"
            >
              <div className="aspect-square bg-stone-200" />
              <div className="space-y-3 p-4">
                <div className="h-4 rounded bg-stone-200" />
                <div className="h-4 w-2/3 rounded bg-stone-200" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200
          bg-red-50 p-6 text-center">
          <p className="font-semibold text-red-800">
            Không tải được menu
          </p>
          <p className="mt-2 text-sm text-red-700">
            {error}
          </p>
          <button
            onClick={() => void loadProducts()}
            className="mt-4 rounded-lg bg-red-700
              px-4 py-2 font-medium text-white"
          >
            Thử lại
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl bg-white p-10
          text-center text-stone-500">
          Chưa có món nào.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4
          md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className="group overflow-hidden rounded-2xl
                border border-stone-200 bg-white
                transition hover:-translate-y-1
                hover:shadow-lg"
            >
              <div className="aspect-square overflow-hidden
                bg-stone-100">
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.name}
                    className="h-full w-full object-cover
                      transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center
                    justify-center text-5xl"
                    aria-label="Chưa có ảnh sản phẩm"
                  >
                    ☕
                  </div>
                )}
              </div>

              <div className="p-3 sm:p-4">
                <h3 className="line-clamp-2 min-h-10
                  font-semibold text-stone-900">
                  {p.name}
                </h3>
                <p className="mt-2 font-bold text-amber-900">
                  {formatVnd(p.price)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}