"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseInfiniteScrollOptions {
  /** Total number of items */
  total: number;
  /** Number of items to load per batch */
  batchSize?: number;
  /** Initial number of items to load */
  initialSize?: number;
}

interface UseInfiniteScrollReturn {
  /** Current visible count */
  visibleCount: number;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Whether we're currently "loading" more */
  isLoading: boolean;
  /** Trigger to load the next batch */
  loadMore: () => void;
  /** Ref to attach to the sentinel element */
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  /** Reset to initial state (e.g. when search/filter changes) */
  reset: () => void;
}

export function useInfiniteScroll({
  total,
  batchSize = 24,
  initialSize = 24,
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn {
  const [visibleCount, setVisibleCount] = useState(initialSize);
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const hasMore = visibleCount < total;

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    setIsLoading(true);
    // Use requestAnimationFrame to batch the state update
    requestAnimationFrame(() => {
      setVisibleCount((prev) => Math.min(prev + batchSize, total));
      setIsLoading(false);
    });
  }, [hasMore, isLoading, batchSize, total]);

  const reset = useCallback(() => {
    setVisibleCount(initialSize);
    setIsLoading(false);
  }, [initialSize]);

  // Intersection Observer on the sentinel element
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      {
        rootMargin: "200px", // Start loading 200px before the sentinel is visible
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

  return {
    visibleCount,
    hasMore,
    isLoading,
    loadMore,
    sentinelRef,
    reset,
  };
}