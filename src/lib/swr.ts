import useSWR, { SWRConfiguration } from "swr";
import { fetchJson } from "./api/client";

/**
 * Shared SWR configuration and fetchers.
 *
 * All data fetching in client components should go through these helpers so
 * that caching, deduping, revalidation and error handling are consistent
 * across the app.
 */

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

/** Fetch a URL and unwrap the `{ success, data }` envelope to `T`. */
export async function fetchApi<T>(url: string): Promise<T> {
  const res = await fetchJson<ApiResponse<T>>(url);
  if (!res.success) {
    throw new Error(res.error || `Request failed: ${url}`);
  }
  return res.data as T;
}

/** Fetch a URL that returns a bare value (no envelope). */
export async function fetchRaw<T>(url: string): Promise<T> {
  return fetchJson<T>(url);
}

export const defaultConfig: SWRConfiguration = {
  // Revalidate on window focus and reconnect to keep data fresh without
  // requiring a full page reload.
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  // Avoid flickering when navigating back to cached pages.
  keepPreviousData: true,
  // Dedupe identical concurrent requests.
  dedupingInterval: 2000,
};

export function useApi<T>(
  key: string | null | undefined,
  fetcher: (url: string) => Promise<T> = fetchApi<T>
) {
  return useSWR<T>(key, fetcher, defaultConfig);
}