"use client";

import { useEffect, useRef } from "react";
import { Product } from "@/lib/schemas";
import { ProductCard } from "./ProductCard";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

interface ProductGridProps {
  products: Product[];
  /** Number of columns on different breakpoints. Default: "2 sm:3 md:4 lg:5" */
  gridClass?: string;
}

export function ProductGrid({
  products,
  gridClass = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
}: ProductGridProps) {
  const { visibleCount, hasMore, isLoading, sentinelRef, reset } =
    useInfiniteScroll({
      total: products.length,
      batchSize: 24,
      initialSize: 24,
    });

  const prevLengthRef = useRef(products.length);

  // Reset when the products array changes (e.g. search/filter changes)
  useEffect(() => {
    if (products.length !== prevLengthRef.current) {
      reset();
      prevLengthRef.current = products.length;
    }
  }, [products.length, reset]);

  const visibleProducts = products.slice(0, visibleCount);

  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p className="text-lg font-medium">No products found</p>
        <p className="text-sm mt-1">
          Try a different category or search term
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className={`grid ${gridClass} gap-3 md:gap-4`}>
        {visibleProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Sentinel element for Intersection Observer */}
      {hasMore && (
        <div ref={sentinelRef} className="w-full h-4" />
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-6">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading more...</span>
          </div>
        </div>
      )}

      {/* "Load More" button as fallback for users with prefers-reduced-motion */}
      {hasMore && !isLoading && (
        <div className="flex justify-center py-6">
          <button
            onClick={() => {
              sentinelRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-xs text-slate-400 hover:text-emerald-600 transition-colors underline underline-offset-2"
          >
            Scroll down to load more ({products.length - visibleCount} remaining)
          </button>
        </div>
      )}

      {/* All loaded message */}
      {!hasMore && products.length > 24 && (
        <div className="text-center py-4 text-xs text-slate-400">
          Showing all {products.length} items
        </div>
      )}
    </div>
  );
}