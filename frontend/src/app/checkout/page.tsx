"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { useCartStore } from "@/store/cart-store";
import { useAuthStore } from "@/store/auth";

type PaymentMethod = "WALLET" | "CARD";
type PaymentResponse = {
  id: number;
  status: "SUCCESS" | "FAILED";
  amount: number;
};

type OrderResponse = {
  id: number;
  code?: string;
  status?: string;
  subtotal?: number;
  discount?: number;
  total?: number;
};

type PromotionResponse = {
  code: string;
  discount: number;
  total: number;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function formatPrice(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

export default function CheckoutPage() {
  const router = useRouter();

  const items = useCartStore((state) => state.items);
  const totalPrice = useCartStore((state) => state.totalPrice());
  const clear = useCartStore((state) => state.clear);
  const token = useAuthStore((state) => state.token);
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);
  // Điểm thưởng: lấy số mới nhất từ GET /auth/me (số lúc đăng nhập có thể đã cũ)
  const [latestPoints, setLatestPoints] = useState<number | null>(null);
  const loyaltyPoints = latestPoints ?? user?.loyaltyPoints ?? 0;

  useEffect(() => {
    if (!token) return;
    apiFetch<{ loyaltyPoints: number }>("/auth/me")
      .then((me) => setLatestPoints(me.loyaltyPoints))
      .catch(() => {
        // Lỗi thì giữ số điểm cũ, không chặn việc thanh toán
      });
  }, [token]);

  useEffect(() => {
  if (!hydrated) return;
  if (!token) {
    router.replace(
      `/login?next=${encodeURIComponent("/checkout")}`
    );
  }
}, [hydrated, token, router]);

  const [method, setMethod] =
    useState<PaymentMethod>("WALLET");

  const [simulateFail, setSimulateFail] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);

  // Promotion
  const [promotionCode, setPromotionCode] = useState("");
  const [appliedPromotionCode, setAppliedPromotionCode] =
    useState("");
  const [discount, setDiscount] = useState(0);
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [promotionError, setPromotionError] =
    useState<string | null>(null);

  const finalTotal = Math.max(totalPrice - discount, 0);

  async function applyPromotion() {
    const code = promotionCode.trim().toUpperCase();

    if (!code) {
      setPromotionError("Vui lòng nhập mã giảm giá.");
      return;
    }

    if (items.length === 0) {
      setPromotionError("Giỏ hàng đang trống.");
      return;
    }

    setPromotionLoading(true);
    setPromotionError(null);

    try {
      const result = await apiFetch<PromotionResponse>(
  "/promotions/validate",
        {
          method: "POST",
          body: JSON.stringify({
            code,
            subtotal: totalPrice,
          }),
        }
      );

      setAppliedPromotionCode(result.code ?? code);
      setDiscount(result.discount ?? 0);
      setPromotionCode(result.code ?? code);
    } catch (err) {
      setAppliedPromotionCode("");
      setDiscount(0);

      setPromotionError(
        err instanceof Error
          ? err.message
          : "Không thể áp dụng mã giảm giá."
      );
    } finally {
      setPromotionLoading(false);
    }
  }

  async function handleCheckout() {
    if (items.length === 0) {
      router.push("/cart");
      return;
    }

    setLoading(true);
    setError(null);

    // Một key cho lần bấm thanh toán này.
    // Nếu bổ sung retry do network sau này, phải tái sử dụng key này.
    const idempotencyKey = crypto.randomUUID();

    try {
      let orderId = pendingOrderId;

      if (orderId === null) {
        const order = await apiFetch<OrderResponse>("/orders", {
        method: "POST",
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            size: item.size,
            toppingIds: item.toppingIds,
            quantity: item.quantity,
          })),
          ...(appliedPromotionCode
              ? { promotionCode: appliedPromotionCode }
            : {}),
        }),
      });

        if (!order.id) {
          throw new Error("API tạo đơn không trả về order id.");
      }
        orderId = order.id;
        setPendingOrderId(order.id);
      }

      if (orderId === null) {
        throw new Error("Không xác định được mã đơn hàng.");
      }

      const payment = await apiFetch<PaymentResponse>(
  "/payments",
        {
          method: "POST",
          headers: {
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
      orderId: orderId,
            method,
            ...(simulateFail
              ? {
                  simulate: "fail",
                }
              : {}),
          }),
        }
      );

if (payment.status !== "SUCCESS") {
  throw new Error("Thanh toán thất bại. Hãy thử lại.");
      }

      // Thành công: quên đơn đang chờ, xoá giỏ, sang trang xác nhận
      setPendingOrderId(null);
      clear();

      router.push(`/orders/${order.id}`);
    } catch (err) {
      // CỐ Ý không clear giỏ khi có lỗi.
      setError(
        err instanceof Error
          ? err.message
          : "Có lỗi xảy ra khi thanh toán."
      );
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-neutral-700 bg-neutral-950 p-8 text-center">
          <div className="mb-4 text-5xl">🛒</div>

          <h1 className="text-2xl font-bold">
            Không có sản phẩm để thanh toán
          </h1>

          <p className="mt-2 text-neutral-400">
            Hãy thêm đồ uống vào giỏ hàng trước.
          </p>

          <Link
            href="/cart"
            className="mt-6 inline-block rounded-xl bg-amber-700 px-6 py-3 font-semibold text-white hover:bg-amber-600"
          >
            Quay lại giỏ hàng
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link
        href="/cart"
        className="text-sm text-amber-700 hover:underline"
      >
        ← Quay lại giỏ hàng
      </Link>

      <h1 className="mt-5 text-3xl font-bold">
        Thanh toán
      </h1>

      <p className="mt-2 text-neutral-400">
        Kiểm tra đơn hàng và chọn phương thức thanh toán.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* LEFT */}
        <section className="space-y-6">
          {/* ITEMS */}
          <div className="rounded-2xl border border-neutral-700 p-5">
            <h2 className="text-xl font-bold">
              Đơn hàng của bạn
            </h2>

            <div className="mt-4 divide-y divide-neutral-800">
              {items.map((item) => (
                <div
                  key={`${item.productId}-${item.size}-${item.toppingIds
                    .slice()
                    .sort()
                    .join("-")}`}
                  className="flex justify-between gap-4 py-4"
                >
                  <div>
                    <h3 className="font-semibold">
                      {item.name}
                    </h3>

                    <p className="mt-1 text-sm text-neutral-400">
                      Size {item.size}
                    </p>

                    {item.toppings.length > 0 && (
                      <p className="mt-1 text-sm text-neutral-400">
                        {item.toppings.join(", ")}
                      </p>
                    )}

                    <p className="mt-1 text-sm text-neutral-400">
                      Số lượng: {item.quantity}
                    </p>
                  </div>

                  <div className="text-right font-semibold">
                    {formatPrice(
                      item.unitPrice * item.quantity
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PROMOTION */}
          <div className="rounded-2xl border border-neutral-700 p-5">
            <h2 className="text-xl font-bold">
              Mã giảm giá
            </h2>

            <p className="mt-1 text-sm text-neutral-400">
              Nhập mã khuyến mãi nếu bạn có.
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={promotionCode}
                onChange={(event) => {
                  setPromotionCode(event.target.value);
                  setPromotionError(null);
                }}
                placeholder="Ví dụ: GIAM10"
                className="min-w-0 flex-1 rounded-xl border border-neutral-700 bg-transparent px-4 py-3 outline-none focus:border-amber-600"
              />

              <button
                type="button"
                disabled={promotionLoading || loading}
                onClick={applyPromotion}
                className="rounded-xl bg-amber-800 px-5 py-3 font-semibold text-white hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {promotionLoading
                  ? "Đang kiểm tra..."
                  : "Áp dụng"}
              </button>
            </div>

            {promotionError && (
              <p className="mt-3 text-sm text-red-500">
                {promotionError}
              </p>
            )}

            {appliedPromotionCode && discount > 0 && (
              <p className="mt-3 text-sm font-medium text-green-500">
                Đã áp dụng mã {appliedPromotionCode}: giảm{" "}
                {formatPrice(discount)}
              </p>
            )}
          </div>

          {/* PAYMENT METHOD */}
          <div className="rounded-2xl border border-neutral-700 p-5">
            <h2 className="text-xl font-bold">
              Phương thức thanh toán
            </h2>

            <div className="mt-4 space-y-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-700 p-4">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="WALLET"
                  checked={method === "WALLET"}
                  onChange={() => setMethod("WALLET")}
                />

                <span>
                  <strong>Ví điện tử</strong>
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-700 p-4">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="CARD"
                  checked={method === "CARD"}
                  onChange={() => setMethod("CARD")}
                />

                <span>
                  <strong>Thẻ</strong>
                </span>
              </label>
            </div>

            <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm text-neutral-400">
              <input
                type="checkbox"
                checked={simulateFail}
                onChange={(event) =>
                  setSimulateFail(event.target.checked)
                }
              />

              Giả lập thanh toán lỗi
            </label>
          </div>
        </section>

        {/* SUMMARY */}
        <aside className="h-fit rounded-2xl border border-neutral-700 p-5 lg:sticky lg:top-6">
          <h2 className="text-xl font-bold">
            Tóm tắt thanh toán
          </h2>

          <div className="mt-5 space-y-3">
            <div className="flex justify-between text-neutral-400">
              <span>Tạm tính</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>

            <div className="flex justify-between text-neutral-400">
              <span>Giảm giá</span>
              <span>
                -{formatPrice(discount)}
              </span>
            </div>

            <div className="border-t border-neutral-700 pt-4">
              <div className="flex items-center justify-between">
                <strong>Tổng thanh toán</strong>

                <strong className="text-xl text-amber-600">
                  {formatPrice(finalTotal)}
                </strong>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleCheckout}
            className="mt-6 w-full rounded-xl bg-amber-700 px-4 py-3 font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Đang xử lý..."
              : "Xác nhận thanh toán"}
          </button>

          <p className="mt-3 text-center text-xs text-neutral-500">
            Không đóng trang trong lúc đang xử lý thanh toán.
          </p>
        </aside>
      </div>
    </main>
  );
}