"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart-store";

type ReturnResult = {
  orderId: number;
  orderStatus: string;
  success: boolean;
};

// Trả xong nhưng đơn đã bị hủy (quá hạn) thì không tính là thành công: tiền được hoàn
const isPaid = (r: ReturnResult) => r.success && r.orderStatus !== "CANCELLED";

type OrderForPay = {
  id: number;
  paymentMethod: "WALLET" | "CARD" | null;
};

// Thành công thì tự chuyển sang trang đơn hàng sau 3 giây
const REDIRECT_SECONDS = 3;

// Câu báo theo mã vnp_ResponseCode VNPay gửi về
function failReason(code: string | null): string {
  switch (code) {
    case "24":
      return "Bạn đã hủy giao dịch trên VNPay.";
    case "11":
      return "Hết thời gian thanh toán trên VNPay.";
    case "51":
      return "Tài khoản không đủ số dư.";
    case "12":
      return "Thẻ hoặc tài khoản đang bị khoá.";
    case "13":
    case "79":
      return "Nhập sai mật khẩu hoặc mã OTP quá số lần cho phép.";
    default:
      return code
        ? `Giao dịch không thành công (mã ${code}).`
        : "Giao dịch không thành công.";
  }
}

function PaymentResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clearCart = useCartStore((s) => s.clear);
  const setLoyaltyPoints = useAuthStore((s) => s.setLoyaltyPoints);
  const token = useAuthStore((s) => s.token);

  const query = searchParams.toString();
  const hasResult = searchParams.has("vnp_TxnRef");
  const responseCode = searchParams.get("vnp_ResponseCode");

  const [result, setResult] = useState<ReturnResult | null>(null);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  // Chế độ dev React chạy effect 2 lần: chỉ gửi kết quả cho backend 1 lần
  const sentQuery = useRef<string | null>(null);

  // 1. Gửi kết quả VNPay (đã có chữ ký) cho backend xác nhận
  useEffect(() => {
    if (!hasResult || sentQuery.current === query) return;
    sentQuery.current = query;

    apiFetch<ReturnResult>(`/payments/vnpay-return?${query}`)
      .then(async (data) => {
        setResult(data);
        if (!isPaid(data)) return;

        // Thanh toán xong: xoá giỏ, cập nhật ⭐ trên Navbar
        clearCart();
        if (useAuthStore.getState().token) {
          const me = await apiFetch<{ loyaltyPoints: number }>("/auth/me");
          setLoyaltyPoints(me.loyaltyPoints);
        }
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Không xác nhận được kết quả thanh toán."
        );
      });
  }, [hasResult, query, clearCart, setLoyaltyPoints]);

  // 2. Thành công: đếm 3 giây rồi sang trang đơn hàng
  const paid = result !== null && isPaid(result);
  const orderId = result?.orderId;
  useEffect(() => {
    if (!paid || orderId === undefined) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    const redirect = setTimeout(() => {
      router.replace(`/orders/${orderId}`);
    }, REDIRECT_SECONDS * 1000);
    return () => {
      clearInterval(timer);
      clearTimeout(redirect);
    };
  }, [paid, orderId, router]);

  // Thanh toán lại: tạo link VNPay mới cho đúng đơn này (không tạo đơn mới)
  async function handlePayAgain() {
    if (!result) return;
    setBusy(true);
    setActionError("");
    try {
      const order = await apiFetch<OrderForPay>(`/orders/${result.orderId}`);
      const payment = await apiFetch<{ payUrl: string }>("/payments", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          orderId: result.orderId,
          method: order.paymentMethod ?? "CARD",
        }),
      });
      window.location.href = payment.payUrl;
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Không tạo được thanh toán VNPay."
      );
      setBusy(false);
    }
  }

  // Hủy đơn: trả nguyên liệu cho quán, rồi sang trang chi tiết đơn
  async function handleCancel() {
    if (!result) return;
    if (!window.confirm("Hủy đơn này?")) return;
    setBusy(true);
    setActionError("");
    try {
      await apiFetch(`/orders/${result.orderId}/cancel`, { method: "PATCH" });
      router.push(`/orders/${result.orderId}`);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Không hủy được đơn."
      );
      setBusy(false);
    }
  }

  if (!hasResult) {
    return (
      <ResultCard icon="!" tone="bg-stone-200 text-stone-700" title="Không có thông tin thanh toán">
        <p className="mt-2 text-stone-500">
          Trang này chỉ mở khi VNPay chuyển bạn về sau khi thanh toán.
        </p>
        <Link
          href="/orders"
          className="mt-6 block rounded-xl bg-amber-900 px-5 py-3 font-semibold text-white hover:bg-amber-800"
        >
          Xem lịch sử đơn hàng
        </Link>
      </ResultCard>
    );
  }

  if (error) {
    return (
      <ResultCard icon="!" tone="bg-red-100 text-red-700" title="Không xác nhận được thanh toán">
        <p className="mt-2 text-red-700">{error}</p>
        <Link
          href="/orders"
          className="mt-6 block rounded-xl bg-amber-900 px-5 py-3 font-semibold text-white hover:bg-amber-800"
        >
          Xem lịch sử đơn hàng
        </Link>
      </ResultCard>
    );
  }

  if (!result) {
    return (
      <ResultCard icon="⏳" tone="bg-amber-100 text-amber-800" title="Đang xác nhận thanh toán…">
        <p className="mt-2 text-stone-500">Vui lòng không đóng trang.</p>
      </ResultCard>
    );
  }

  if (paid) {
    return (
      <ResultCard icon="✓" tone="bg-green-100 text-green-700" title="Thanh toán thành công">
        <p className="mt-2 text-stone-500">
          Tự chuyển sang đơn hàng sau {secondsLeft} giây…
        </p>
        <Link
          href={`/orders/${result.orderId}`}
          className="mt-6 block rounded-xl bg-amber-900 px-5 py-3 font-semibold text-white hover:bg-amber-800"
        >
          Xem đơn hàng
        </Link>
      </ResultCard>
    );
  }

  // Đơn đã hủy (hết hạn hoặc khách đã hủy) thì không thanh toán lại được
  if (result.orderStatus === "CANCELLED") {
    return (
      <ResultCard icon="✕" tone="bg-stone-200 text-stone-700" title="Đơn đã hủy">
        <p className="mt-2 text-stone-500">
          {result.success
            ? "Đơn đã quá hạn thanh toán nên bị hủy. Số tiền bạn vừa trả sẽ được hoàn lại qua VNPay."
            : "Đơn đã quá hạn thanh toán hoặc đã bị hủy."}
        </p>
        <Link
          href={`/orders/${result.orderId}`}
          className="mt-6 block rounded-xl bg-amber-900 px-5 py-3 font-semibold text-white hover:bg-amber-800"
        >
          Xem đơn hàng
        </Link>
      </ResultCard>
    );
  }

  // VNPay chưa xác nhận xong: xem lại ở trang đơn hàng
  if (result.orderStatus === "PENDING") {
    return (
      <ResultCard icon="⏳" tone="bg-amber-100 text-amber-800" title="Đang chờ VNPay xác nhận">
        <p className="mt-2 text-stone-500">
          Kết quả thanh toán sẽ được cập nhật ở trang đơn hàng.
        </p>
        <Link
          href={`/orders/${result.orderId}`}
          className="mt-6 block rounded-xl bg-amber-900 px-5 py-3 font-semibold text-white hover:bg-amber-800"
        >
          Xem đơn hàng
        </Link>
      </ResultCard>
    );
  }

  return (
    <ResultCard icon="!" tone="bg-red-100 text-red-700" title="Thanh toán chưa thành công">
      <p className="mt-2 text-red-700">{failReason(responseCode)}</p>
      <p className="mt-1 text-sm text-stone-500">
        Giỏ hàng vẫn được giữ nguyên.
      </p>

      {actionError && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <div className="mt-6 space-y-3">
        <button
          onClick={handlePayAgain}
          disabled={busy || !token}
          className="w-full rounded-xl bg-amber-900 px-5 py-3 font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Đang xử lý…" : "Thanh toán lại"}
        </button>
        <button
          onClick={handleCancel}
          disabled={busy || !token}
          className="w-full rounded-xl border border-red-300 px-5 py-3 font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Hủy đơn
        </button>
        <Link
          href="/cart"
          className="block rounded-xl border border-stone-300 px-5 py-3 font-semibold text-stone-700 hover:bg-stone-50"
        >
          Về giỏ hàng
        </Link>
      </div>
    </ResultCard>
  );
}

function ResultCard({
  icon,
  tone,
  title,
  children,
}: {
  icon: string;
  tone: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <section className="rounded-2xl border bg-white p-6 text-center shadow-sm sm:p-8">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${tone}`}
        >
          {icon}
        </div>
        <h1 className="mt-4 text-2xl font-bold text-stone-900">{title}</h1>
        {children}
      </section>
    </main>
  );
}

// useSearchParams() phải nằm trong <Suspense> thì Next.js mới build được
export default function PaymentResultPage() {
  return (
    <Suspense fallback={null}>
      <PaymentResultContent />
    </Suspense>
  );
}
