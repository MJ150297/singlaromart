export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Resolve the API base URL.
 *
 * - If `NEXT_PUBLIC_API_URL` is set (e.g. the API is hosted separately), use it.
 * - On the server, derive the origin from the incoming request's Host header so
 *   relative paths work in this monolithic app without per-environment config.
 * - On the client, return the relative `/api` — the browser resolves it against
 *   `window.location.origin`.
 */
async function getApiBase(): Promise<string> {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Client-side: relative URL is fine, the browser resolves it.
  if (typeof window !== "undefined") {
    return "/api";
  }

  // Server-side: Node's fetch requires an absolute URL, so derive the origin
  // from the request headers. Dynamic import keeps `next/headers` out of the
  // client bundle.
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const proto = h.get("x-forwarded-proto") || "http";
    const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
    return `${proto}://${host}/api`;
  } catch {
    return "http://localhost:3000/api";
  }
}

export async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const base = await getApiBase();
  const url = input.startsWith("http") ? input : `${base}${input}`;

  // Server-side: forward the incoming request's cookies so authenticated
  // API routes (e.g. admin) can read the session. The browser sends cookies
  // automatically on the client, so this only applies when running on the server.
  let headers = init?.headers;
  if (typeof window === "undefined") {
    try {
      const { cookies } = await import("next/headers");
      const cookieHeader = (await cookies()).toString();
      if (cookieHeader) {
        headers = { ...(headers as Record<string, string> | undefined), cookie: cookieHeader };
      }
    } catch {
      // Not in a request context (e.g. build time) — skip cookie forwarding.
    }
  }

  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(text || res.statusText, res.status);
  }
  return (await res.json()) as T;
}