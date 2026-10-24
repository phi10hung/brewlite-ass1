"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatDateTime, formatVnd } from "@/lib/format";
import { getOrderStatus } from "@/lib/order-status";

interface Order {
  id: number;
  code: string;
  status: string;
  total: number;
  createdAt: string;
  items: { productName: string; quantity: number }[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiFetch<Order[]>("/orders/me");
      setOrders(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải lịch sử đơn hàng."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  return (
    <main className="mx-auto min-h-[60vh] max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/" className="text-sm text-amber-900 underline">
        ← Quay lại Menu
      </Link>

      <h1 className="mt-5 text-3xl font-bold text-stone-900">
        Lịch sử đơn hàng
      </h1>
      <p className="mt-2 text-stone-500">
        Theo dõi các đơn hàng của bạn tại BrewLite.
      </p>

      {loading ? (
        <div className="mt-8 space-y-4" aria-live="polite">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border bg-white p-5"
            >
              <div className="h-4 w-1/3 rounded bg-stone-200" />
              <div className="mt-4 h-4 w-2/3 rounded bg-stone-200" />
              <div className="mt-4 h-6 w-1/4 rounded bg-stone-200" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-800">
            Không tải được lịch sử đơn hàng
          </p>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <button
            onClick={() => void loadOrders()}
            className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-white"
          >
            Thử lại
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-8 rounded-2xl border bg-white px-5 py-12 text-center">
          <p className="text-4xl">☕</p>
          <h2 className="mt-4 text-lg font-semibold">
            Bạn chưa có đơn hàng nào
          </h2>
          <p className="mt-2 text-sm text-stone-500">
            Hãy chọn một món uống yêu thích nhé.
          </p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-lg bg-amber-900 px-5 py-3 font-medium text-white"
          >
            Khám phá Menu
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {orders.map((order) => {
            const status = getOrderStatus(order.status);

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block rounded-2xl border bg-white p-4 transition hover:border-amber-400 hover:shadow-md sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-stone-500">
                      Mã đơn hàng
                    </p>
                    <h2 className="mt-1 font-bold text-stone-900">
                      {order.code}
                    </h2>
                    <p className="mt-2 text-sm text-stone-500">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <span className="text-sm text-stone-500">
                    Tổng tiền
                  </span>
                  <span className="text-lg font-bold text-amber-900">
                    {formatVnd(order.total)}
                  </span>
                </div>

                <p className="mt-3 text-right text-sm font-medium text-amber-900">
                  Xem chi tiết →
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}