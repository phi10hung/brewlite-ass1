"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useCartStore } from "@/store/cart-store";

// Giỏ hàng lưu trong trình duyệt (localStorage), nên chỉ hiện số lượng
// sau khi trang đã tải xong ở trình duyệt, tránh lỗi lệch giao diện.
const subscribe = () => () => {};
const useIsClient = () =>
  useSyncExternalStore(subscribe, () => true, () => false);

export default function Navbar() {
  const isClient = useIsClient();
  const cartCount = useCartStore((s) => s.totalItems());

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
        </div>
      </nav>
    </header>
  );
}
