"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { formatDateTime, formatVnd } from "@/lib/format";
import {
  getOrderStatus,
  getRefundLabel,
  type RefundStatus,
} from "@/lib/order-status";
import { useAuthStore } from "@/store/auth";

interface OrderItem {
  productName: string;
  size: string;
  toppings: string[];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface OrderDetail {
  id: number;
  code: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  promotionCode: string | null;
  paymentMethod: "WALLET" | "CARD" | null;
  expiresAt: string | null;
  refundStatus: RefundStatus | null;
  createdAt: string;
  items: OrderItem[];
}

// Hệ thống tự hủy đơn quá hạn mỗi 30 giây → hết giờ thì chờ một chút rồi tải lại
const RELOAD_AFTER_EXPIRED_MS = 35_000;

function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function OrderDetailContent() {
  const params = useParams<{ id: string }>();
  const setLoyaltyPoints = useAuthStore((s) => s.setLoyaltyPoints);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      try {
        const data = await apiFetch<OrderDetail>(`/orders/${params.id}`);
        if (active) {
          setOrder(data);
          setError("");
        }
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
  }, [params.id, reloadKey]);

  const waiting =
    order?.status === "PENDING" || order?.status === "PAYMENT_FAILED";
  const remainingMs =
    waiting && order?.expiresAt
      ? Math.max(0, new Date(order.expiresAt).getTime() - now)
      : null;
  const expired = remainingMs === 0;

  // Đồng hồ đếm ngược: chỉ chạy khi đơn đang chờ thanh toán
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waiting]);

  // Hết giờ: đợi hệ thống tự hủy rồi tải lại đơn
  useEffect(() => {
    if (!expired) return;
    const timer = setTimeout(
      () => setReloadKey((key) => key + 1),
      RELOAD_AFTER_EXPIRED_MS
    );
    return () => clearTimeout(timer);
  }, [expired]);

  function reload() {
    setReloadKey((key) => key + 1);
  }

  // Tiếp tục thanh toán / Thanh toán lại: tạo link VNPay mới rồi chuyển sang VNPay
  async function handlePay() {
    if (!order) return;
    setBusy(true);
    setActionError("");

    try {
      const payment = await apiFetch<{ payUrl: string }>("/payments", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          orderId: order.id,
          method: order.paymentMethod ?? "CARD",
        }),
      });
      window.location.href = payment.payUrl;
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Không tạo được thanh toán VNPay."
      );
      setBusy(false);
      reload();
    }
  }

  async function handleCancel() {
    if (!order) return;

    const wasPaid = order.status === "PAID";
    const question = wasPaid
      ? `Hủy đơn ${order.code}? Bạn sẽ được hoàn ${formatVnd(order.total)} qua VNPay và bị trừ ${Math.floor(order.total / 10000)} điểm thưởng.`
      : `Hủy đơn ${order.code}? Nguyên liệu sẽ được trả lại cho quán.`;
    if (!window.confirm(question)) return;

    setBusy(true);
    setActionError("");

    try {
      const updated = await apiFetch<OrderDetail>(
        `/orders/${order.id}/cancel`,
        { method: "PATCH" }
      );
      if (updated) setOrder(updated);

      // Đơn đã thanh toán bị trừ điểm → cập nhật ⭐ trên Navbar ngay
      if (wasPaid) {
        const me = await apiFetch<{ loyaltyPoints: number }>("/auth/me");
        setLoyaltyPoints(me.loyaltyPoints);
      }
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Không hủy được đơn, vui lòng thử lại."
      );
    } finally {
      setBusy(false);
      reload();
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/2 rounded bg-stone-200" />
          <div className="h-32 rounded-2xl bg-stone-200" />
          <div className="h-24 rounded-2xl bg-stone-200" />
        </div>
        <p className="mt-4 text-sm text-stone-500" aria-live="polite">
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
  const refundLabel = getRefundLabel(order.refundStatus);
  const failed = order.status === "PAYMENT_FAILED";
  const cancelled = order.status === "CANCELLED";
  const canCancelPaid = order.status === "PAID";

  const header = cancelled
    ? { icon: "✕", tone: "bg-stone-200 text-stone-700", title: "Đơn đã hủy" }
    : failed
      ? {
          icon: "!",
          tone: "bg-red-100 text-red-700",
          title: "Thanh toán chưa thành công",
        }
      : waiting
        ? {
            icon: "⏱",
            tone: "bg-amber-100 text-amber-800",
            title: "Đơn chờ thanh toán",
          }
        : {
            icon: "✓",
            tone: "bg-green-100 text-green-700",
            title: "Đặt hàng thành công",
          };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/orders" className="text-sm text-amber-900 underline">
        ← Lịch sử đơn hàng
      </Link>

      <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm sm:p-8">
        <div className="text-center">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${header.tone}`}
          >
            {header.icon}
          </div>

          <h1 className="mt-4 text-2xl font-bold text-stone-900">
            {header.title}
          </h1>

          <p className="mt-2 text-sm text-stone-500">Mã đơn hàng</p>
          <p className="text-xl font-bold tracking-wide text-amber-900">
            {order.code}
          </p>
          <p className="mt-1 text-sm text-stone-500">
            {formatDateTime(order.createdAt)}
          </p>

          <span
            className={`mt-4 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${status.className}`}
          >
            {status.label}
          </span>

          {refundLabel && (
            <p className="mt-2 text-sm font-medium text-stone-600">
              {refundLabel}
            </p>
          )}

          {!waiting && !cancelled && (
            <p className="mt-3 text-sm text-stone-600">
              Mời bạn tới quầy lấy nước.
            </p>
          )}
        </div>

        {/* Đơn chờ thanh toán / thanh toán lỗi: thanh toán tiếp hoặc hủy */}
        {waiting && (
          <div
            className={`mt-6 rounded-2xl border p-5 ${
              failed ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
            }`}
          >
            {failed && (
              <p className="font-medium text-red-700">
                Thanh toán chưa thành công, bạn có thể thanh toán lại.
              </p>
            )}

            {remainingMs !== null && !expired && (
              <p
                className={`mt-1 text-lg font-semibold ${
                  remainingMs < 60_000 ? "text-red-700" : "text-stone-800"
                }`}
              >
                ⏱ Còn {formatCountdown(remainingMs)} để thanh toán
              </p>
            )}

            {expired ? (
              <p className="mt-1 font-medium text-stone-700">
                Đơn đang được hủy vì hết thời gian thanh toán…
              </p>
            ) : (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handlePay}
                  className="flex-1 rounded-xl bg-amber-900 px-5 py-3 font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy
                    ? "Đang chuyển sang VNPay…"
                    : failed
                      ? "Thanh toán lại"
                      : "Tiếp tục thanh toán"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleCancel}
                  className="rounded-xl border border-red-300 px-5 py-3 font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Hủy đơn
                </button>
              </div>
            )}
          </div>
        )}

        {actionError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {actionError}
          </div>
        )}

        <div className="mt-8 border-t pt-6">
          <h2 className="text-lg font-bold">Danh sách món</h2>

          {order.items.length ? (
            <ul className="mt-4 divide-y">
              {order.items.map((item, index) => (
                <li
                  key={index}
                  className="flex items-start justify-between gap-4 py-4"
                >
                  <div>
                    <p className="font-medium text-stone-900">
                      {item.productName}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">
                      Size {item.size} · {formatVnd(item.unitPrice)} ×{" "}
                      {item.quantity}
                    </p>
                    {item.toppings.length > 0 && (
                      <p className="mt-1 text-sm text-stone-500">
                        Topping: {item.toppings.join(", ")}
                      </p>
                    )}
                  </div>

                  <p className="shrink-0 font-semibold">
                    {formatVnd(item.lineTotal)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-stone-500">
              Đơn hàng chưa có món nào.
            </p>
          )}
        </div>

        <dl className="mt-4 space-y-3 border-t pt-5">
          <div className="flex justify-between gap-4">
            <dt className="text-stone-600">Tạm tính</dt>
            <dd>{formatVnd(order.subtotal)}</dd>
          </div>

          <div className="flex justify-between gap-4">
            <dt className="text-stone-600">
              Giảm giá
              {order.promotionCode ? ` (${order.promotionCode})` : ""}
            </dt>
            <dd className="text-green-700">
              {order.discount > 0
                ? `-${formatVnd(order.discount)}`
                : formatVnd(0)}
            </dd>
          </div>

          {order.paymentMethod && (
            <div className="flex justify-between gap-4">
              <dt className="text-stone-600">Phương thức</dt>
              <dd>
                {order.paymentMethod === "CARD"
                  ? "Thẻ ngân hàng (VNPay)"
                  : "Ví điện tử (VNPay)"}
              </dd>
            </div>
          )}

          <div className="flex justify-between gap-4 border-t pt-3">
            <dt className="font-semibold">Tổng cộng</dt>
            <dd className="text-xl font-bold text-amber-900">
              {formatVnd(order.total)}
            </dd>
          </div>
        </dl>

        {/* Đơn đã thanh toán, quán chưa nhận: khách được hủy và hoàn tiền */}
        {canCancelPaid && (
          <button
            type="button"
            disabled={busy}
            onClick={handleCancel}
            className="mt-6 w-full rounded-xl border border-red-300 px-5 py-3 font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Đang hủy đơn…" : "Hủy đơn"}
          </button>
        )}

        <Link
          href="/"
          className="mt-4 block rounded-xl bg-amber-900 px-5 py-3 text-center font-semibold text-white hover:bg-amber-800"
        >
          Tiếp tục mua hàng
        </Link>
      </section>
    </main>
  );
}

// useParams() phải nằm trong <Suspense> thì Next.js mới build được
export default function OrderDetailPage() {
  return (
    <Suspense fallback={null}>
      <OrderDetailContent />
    </Suspense>
  );
}
