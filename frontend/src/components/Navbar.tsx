
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export default function Navbar() {
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const logout = useAuthStore((s) => s.logout);

  // Thay bằng số lượng thực khi tích hợp cart store
  const cartCount = 0;

  function handleLogout() {
    logout();
    router.replace("/");
    router.refresh();
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

          <Link
            href="/orders"
            className="hidden hover:text-amber-700 sm:block"
          >
            Lịch sử đơn
          </Link>

          <Link
            href="/cart"
            className="rounded-lg bg-amber-100 px-2 py-2 text-amber-950"
          >
            🛒 <span>{cartCount}</span>
          </Link>

          {hydrated && user ? (
            <>
              <span className="hidden max-w-32 truncate font-medium sm:block">
                {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-lg border px-3 py-2 hover:bg-stone-100"
              >
                Đăng xuất
              </button>
            </>
          ) : hydrated ? (
            <Link
              href="/login"
              className="rounded-lg bg-amber-900 px-3 py-2 text-white"
            >
              Đăng nhập
            </Link>
          ) : (
            <span className="text-stone-400">...</span>
          )}
        </div>
      </nav>
    </header>
  );
}