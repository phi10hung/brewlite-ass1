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
  const clearCart = useCartStore((s) => s.clear);
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

  // Xoá giỏ khi tự đăng xuất để người sau không thấy giỏ của mình
  function handleLogout() {
    clearCart();
    logout();
    router.replace("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6">
        <Link href="/" className="shrink-0 text-xl font-bold text-amber-900">
          BrewLite
        </Link>

        <div className="flex items-center gap-2 whitespace-nowrap text-sm sm:gap-5">
          {/* Điện thoại: ẩn "Menu" vì bấm logo cũng về Menu */}
          <Link href="/" className="hidden hover:text-amber-700 sm:inline">
            Menu
          </Link>
          {isClient && user && (
            <Link href="/orders" aria-label="Lịch sử đơn" className="hover:text-amber-700">
              <span className="sm:hidden">Đơn</span>
              <span className="hidden sm:inline">Lịch sử đơn</span>
            </Link>
          )}

          {isClient && user?.role === "STAFF" && (
            <Link href="/staff" aria-label="Quản lý đơn" className="hover:text-amber-700">
              <span className="sm:hidden">Quản lý</span>
              <span className="hidden sm:inline">Quản lý đơn</span>
            </Link>
          )}

          {isClient && user?.role === "STAFF" && (
            <Link href="/staff/ingredients" aria-label="Kho nguyên liệu" className="hover:text-amber-700">
              <span className="sm:hidden">Kho</span>
              <span className="hidden sm:inline">Kho nguyên liệu</span>
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
                  className="rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-900"
                >
                  ⭐ {user.loyaltyPoints ?? 0}
                  <span className="hidden sm:inline"> điểm</span>
                </span>
              )}
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Đăng xuất"
                className="rounded-lg border px-2 py-2 hover:bg-stone-100 sm:px-3"
              >
                <span className="sm:hidden">Thoát</span>
                <span className="hidden sm:inline">Đăng xuất</span>
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
