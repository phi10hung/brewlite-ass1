"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart-store";

// Giỏ hàng và thông tin đăng nhập lưu trong trình duyệt (localStorage), nên chỉ
// hiện sau khi trang đã tải xong ở trình duyệt, tránh lỗi lệch giao diện.
const subscribe = () => () => {};
const useIsClient = () =>
  useSyncExternalStore(subscribe, () => true, () => false);

export default function Navbar() {
  const router = useRouter();
  const isClient = useIsClient();
  const cartCount = useCartStore((s) => s.totalItems());
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setLoyaltyPoints = useAuthStore((s) => s.setLoyaltyPoints);
  const isCustomer = user?.role === "CUSTOMER";

  // Lấy điểm thưởng mới nhất khi vào trang và mỗi khi giỏ hàng thay đổi.
  // Thanh toán thành công thì giỏ được xoá → số điểm trên Navbar tăng ngay.
  useEffect(() => {
    if (!isCustomer) return;
    apiFetch<{ loyaltyPoints: number }>("/auth/me")
      .then((me) => setLoyaltyPoints(me.loyaltyPoints))
      .catch(() => {
        // Lỗi mạng thì giữ số điểm cũ, không làm phiền khách
      });
  }, [cartCount, isCustomer, setLoyaltyPoints]);

  function handleLogout() {
    logout();
    router.replace("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="text-xl font-bold text-amber-900">
          BrewLite
        </Link>

        <div className="flex items-center gap-3 text-sm sm:gap-5">
          <Link href="/" className="hover:text-amber-700">
            Menu
          </Link>

          {isClient && user && (
            <Link href="/orders" className="hover:text-amber-700">
              Lịch sử đơn
            </Link>
          )}

          {isClient && user?.role === "STAFF" && (
            <Link href="/staff" className="hover:text-amber-700">
              Quản lý đơn
            </Link>
          )}

          <Link
            href="/cart"
            aria-label="Giỏ hàng"
            className="relative rounded-lg bg-amber-100 px-3 py-2 text-amber-950"
          >
            🛒
            {isClient && cartCount > 0 && (
              <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Đã đăng nhập: hiện tên + nút Đăng xuất; chưa đăng nhập: nút Đăng nhập */}
          {isClient && user ? (
            <>
              <span className="hidden max-w-32 truncate font-medium sm:block">
                {user.name}
              </span>
              {isCustomer && (
                <span
                  title="Điểm thưởng tích luỹ"
                  className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-900"
                >
                  ⭐ {user.loyaltyPoints ?? 0}
                  <span className="hidden sm:inline"> điểm</span>
                </span>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border px-3 py-2 hover:bg-stone-100"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-amber-900 px-3 py-2 text-white"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
