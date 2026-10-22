import { useAuthStore } from "@/store/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!API_URL) {
    throw new Error("Chưa cấu hình NEXT_PUBLIC_API_URL");
  }

  const token = useAuthStore.getState().token;
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`,
      { ...options, headers }
    );
  } catch {
    throw new Error(
      "Không thể kết nối máy chủ. Hãy kiểm tra backend."
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    const message =
      body?.message ??
      body?.error ??
      `Lỗi máy chủ (${response.status})`;

    if (
      response.status === 401 &&
      !path.startsWith("/auth/login") &&
      !path.startsWith("/auth/register")
    ) {
      useAuthStore.getState().logout();

      if (typeof window !== "undefined") {
        const currentPath =
          window.location.pathname +
          window.location.search;

        window.location.assign(
          `/login?next=${encodeURIComponent(currentPath)}`
        );
      }
    }

    throw new Error(
      Array.isArray(message) ? message.join(", ") : String(message)
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}