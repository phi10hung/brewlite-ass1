"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { formatVnd } from "@/lib/format";
import { getOrderStatus } from "@/lib/order-status";

interface OrderItem {
  id: number | string;
  productName?: string;
  name?: string;
  quantity: number;
  price: number;
  subtotal?: number;
}

interface OrderDetail {
  id: number | string;
  status: string;
  total: number;
  createdAt?: string;
  items: OrderItem[];
  pointsEarned?: number;
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      setLoading(true);
      setError("");

      try {
        const data = await apiFetch<OrderDetail>(
          `/orders/${params.id}`
        );

        if (active) setOrder(data);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Không thể tải thông tin đơn hàng."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadOrder();

    return () => {
      active = false;
    };
  }, [params.id]);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/2 rounded bg-stone-200" />
          <div className="h-32 rounded-2xl bg-stone-200" />
          <div className="h-24 rounded-2xl bg-stone-200" />
        </div>
        <p className="mt-4 text-sm text-stone-500">
          Đang tải thông tin đơn hàng...
        </p>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-xl font-bold text-red-800">
            Không tải được đơn hàng
          </h1>
          <p className="mt-2 text-red-700">
            {error || "Không tìm thấy đơn hàng."}
          </p>
          <Link
            href="/orders"
            className="mt-5 inline-block font-medium text-amber-900 underline"
          >
            Quay lại lịch sử đơn hàng
          </Link>
        </div>
      </main>
    );
  }

  const status = getOrderStatus(order.status);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/orders"
        className="text-sm text-amber-900 underline"
      >
        ← Lịch sử đơn hàng
      </Link>

      <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
            ✓
          </div>

          <h1 className="mt-4 text-2xl font-bold text-stone-900">
            Thông tin đơn hàng
          </h1>

          <p className="mt-2 text-sm text-stone-500">
            Mã đơn hàng: #{order.id}
          </p>

          <span
            className={`mt-4 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        <div className="mt-8 border-t pt-6">
          <h2 className="text-lg font-bold">Danh sách món</h2>

          {order.items?.length ? (
            <div className="mt-4 divide-y">
              {order.items.map((item, index) => (
                <div
                  key={item.id ?? index}
                  className="flex items-start justify-between gap-4 py-4"
                >
                  <div>
                    <p className="font-medium text-stone-900">
                      {item.productName ?? item.name ?? "Sản phẩm"}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">
                      {formatVnd(item.price)} × {item.quantity}
                    </p>
                  </div>

                  <p className="shrink-0 font-semibold">
                    {formatVnd(
                      item.subtotal ?? item.price * item.quantity
                    )}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-stone-500">
              Chưa có thông tin chi tiết các món.
            </p>
          )}
        </div>

        <div className="mt-4 space-y-3 border-t pt-5">
          <div className="flex justify-between gap-4">
            <span className="text-stone-600">Tổng tiền</span>
            <span className="text-xl font-bold text-amber-900">
              {formatVnd(order.total)}
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-stone-600">Điểm thưởng nhận được</span>
            <span className="font-semibold text-green-700">
              +{order.pointsEarned ?? 0} điểm
            </span>
          </div>
        </div>

        <Link
          href="/"
          className="mt-8 block rounded-xl bg-amber-900 px-5 py-3 text-center font-semibold text-white hover:bg-amber-800"
        >
          Tiếp tục mua hàng
        </Link>
      </section>
    </main>
  );
}