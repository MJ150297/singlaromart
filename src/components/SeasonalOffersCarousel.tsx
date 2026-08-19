"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { OfferSection } from "@/lib/api/offers";
import { type CloudinaryImage } from "@/lib/schemas";

/** Resolve a string/Cloudinary image value to a usable src URL. */
function resolveImageSrc(image?: string | CloudinaryImage): string | null {
  if (!image) return null;
  if (typeof image === "string") return image;
  return image.secureUrl || image.url || image.transformations?.card || image.transformations?.thumbnail || null;
}

interface SeasonalOffersCarouselProps {
  sections: OfferSection[];
}

export function SeasonalOffersCarousel({
  sections,
}: SeasonalOffersCarouselProps) {
  if (!sections || sections.length === 0) return null;

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <CarouselRow key={section.id} section={section} />
      ))}
    </div>
  );
}

// ─── Single carousel row ──────────────────────────────────────────────────────

function CarouselRow({ section }: { section: OfferSection }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    // Re-check on resize
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  const scrollBy = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 220; // approximate card width + gap
    const scrollAmount = direction === "left" ? -cardWidth * 2 : cardWidth * 2;
    el.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  const bannerSrc = resolveImageSrc(section.bannerImage);

  return (
    <section className="relative">
      {/* Offer Banner Image with overlay text */}
      {bannerSrc && (
        <div className="relative w-full aspect-[16/4] md:aspect-[14/3] rounded-xl overflow-hidden mb-4 shadow-md">
          <Image
            src={bannerSrc}
            alt={section.title}
            fill
            sizes="(max-width: 768px) 100vw, 1200px"
            className="object-cover"
          />
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent" />
          {/* Overlay text */}
          <div className="absolute inset-0 flex flex-col justify-center px-5 md:px-8 lg:px-12">
            <span className="inline-flex items-center gap-1.5 w-fit text-[10px] md:text-xs font-bold uppercase tracking-[0.22em] text-amber-300 drop-shadow mb-2 md:mb-3">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
              Limited Time Offer
            </span>
            <h3 className="text-white font-extrabold leading-tight drop-shadow-lg text-xl sm:text-2xl md:text-3xl lg:text-4xl max-w-2xl">
              {section.title}
            </h3>
            {section.description && (
              <p className="text-white/85 text-xs sm:text-sm md:text-base lg:text-lg mt-1 md:mt-2 max-w-xl leading-snug drop-shadow line-clamp-1 md:line-clamp-2">
                {section.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Section Header (only shown when there's no banner image) */}
      {!bannerSrc && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-base md:text-lg text-slate-900 dark:text-slate-100">
            {section.title}
          </h3>
          <span className="text-xs text-slate-400">
            {section.products.length} item{section.products.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Carousel Container */}
      <div className="relative group">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scrollBy("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all opacity-0 group-hover:opacity-100 -ml-3"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Scrollable Track */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 -mx-1 px-1 scrollbar-none"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {section.products.map((product) => (
            <div
              key={product.id}
              className="snap-start shrink-0 w-[200px]"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scrollBy("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all opacity-0 group-hover:opacity-100 -mr-3"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </section>
  );
}