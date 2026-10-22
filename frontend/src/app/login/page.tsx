"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuthStore, User } from "@/store/auth";

interface LoginResponse {
  accessToken: string;
  user: User;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Vui lòng nhập email hợp lệ.");
      return;
    }

    if (!password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    setLoading(true);

    try {
      const result = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      setSession(result.accessToken, result.user);

      const next = searchParams.get("next");
      const destination =
        next?.startsWith("/") && !next.startsWith("//")
          ? next
          : "/";

      router.replace(destination);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Đăng nhập thất bại."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <div className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
        <Link href="/" className="font-bold text-amber-900">
          ← BrewLite
        </Link>

        <h1 className="mt-6 text-3xl font-bold">
          Đăng nhập
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Đăng nhập để tiếp tục đặt đồ uống.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border px-3 py-3 outline-none focus:ring-2 focus:ring-amber-700"
              placeholder="ban@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-3 outline-none focus:ring-2 focus:ring-amber-700"
              placeholder="Nhập mật khẩu"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-amber-900 px-4 py-3 font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-stone-600">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-semibold text-amber-900 underline">
            Đăng ký
          </Link>
        </p>
      </div>
    </main>
  );
}