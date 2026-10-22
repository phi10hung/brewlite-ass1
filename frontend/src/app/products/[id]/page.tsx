"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { formatVnd } from "@/lib/format";
import type { ProductDetail } from "@/lib/types";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] =
    useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const data = await apiFetch<ProductDetail>(
          `/products/${params.id}`
        );

        if (active) setProduct(data);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Không thể tải sản phẩm."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [params.id]);

  if (loading) {
    return <p className="p-8">Đang tải sản phẩm...</p>;
  }

  if (error || !product) {
    return (
      <div className="p-8 text-center">
        <p>{error || "Không tìm thấy sản phẩm."}</p>
        <Link href="/" className="mt-4 inline-block underline">
          Quay lại Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <Link href="/" className="text-amber-900 underline">
        ← Quay lại Menu
      </Link>

      <div className="mt-6 grid gap-8 sm:grid-cols-2">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="aspect-square w-full rounded-2xl
              object-cover"
          />
        ) : (
          <div className="flex aspect-square items-center
            justify-center rounded-2xl bg-stone-100 text-7xl">
            ☕
          </div>
        )}

        <div>
          <h1 className="text-3xl font-bold">
            {product.name}
          </h1>
          <p className="mt-4 text-2xl font-bold text-amber-900">
            {formatVnd(product.price)}
          </p>
          <p className="mt-6 leading-7 text-stone-600">
            {product.description || "Chưa có mô tả cho sản phẩm này."}
          </p>
        </div>
      </div>
    </div>
  );
}