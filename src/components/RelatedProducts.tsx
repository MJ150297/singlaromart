"use client";

import { useRef } from "react";
import useSWR from "swr";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Product } from "@/lib/schemas";
import { getRelatedProducts } from "@/lib/catalog";
import { ProductCard } from "./ProductCard";

interface RelatedProductsProps {
  productId: string;
  category?: string;
}

export function RelatedProducts({ productId, category }: RelatedProductsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data } = useSWR<Product[]>(["related-product", productId], async () => {
    const products = await getRelatedProducts(productId, 8);
    return products;
  });

  const products = data ?? [];

  if (products.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 200;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-base md:text-lg text-slate-800 dark:text-slate-200">
          Best Value Picks
        </h4>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll("left")}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="snap-start shrink-0 w-[200px]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}