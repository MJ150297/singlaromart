"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCategories, Category } from "@/lib/api/categories";
import { CategoryIcon } from "@/lib/categoryIcons";
import type { CloudinaryImage } from "@/lib/schemas";

/** Extract a display URL from a string or a Cloudinary image object. */
function imageUrl(
  img?: string | CloudinaryImage
): string {
  if (!img) return "";
  if (typeof img === "string") return img;
  return img.secureUrl || img.url || img.transformations?.card || img.transformations?.thumbnail || "";
}

function SubcategoryItem({
  name,
  image,
  onClick,
}: {
  name: string;
  image?: string | CloudinaryImage;
  onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const src = imageUrl(image);

  return (
    <div
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
        {imgError || !src ? (
          <span className="text-lg">📦</span>
        ) : (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <span className="text-sm text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
        {name}
      </span>
    </div>
  );
}

export function MegaMenu() {
  const router = useRouter();
  const listRef = useRef<HTMLUListElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // Fetch categories from the API
  useEffect(() => {
    getCategories()
      .then((data) => {
        if (data.length > 0) {
          setCategories(data);
        }
      })
      .catch((err) => console.error("Failed to fetch categories:", err));
  }, []);

  // ─── Scroll position check for arrows ──────────────────────────────────
  const checkScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 4);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 4,
    );
  }, []);

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (!container) return;
    container.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      container.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, categories]);

  // ─── Scroll by arrow buttons ───────────────────────────────────────────
  const scrollBy = (direction: "left" | "right") => {
    scrollContainerRef.current?.scrollBy({
      left: direction === "left" ? -200 : 200,
      behavior: "smooth",
    });
  };

  // ─── Close submenu on click outside ────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveCategory(null);
      }
    }
    if (activeCategory) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeCategory]);

  // ─── Find active category object ───────────────────────────────────────
  const activeCat = categories.find((c) => c.id === activeCategory);

  return (
    <div ref={menuRef} className="relative">
      {/* Top Bar */}
      <div className="relative group">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scrollBy("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all -ml-3"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Category List */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto touch-pan-x scrollbar-none"
        >
          <ul
            ref={listRef}
            className="flex w-max min-w-full gap-1"
          >
            {categories.map((cat) => (
              <li
                key={cat.id}
                className="shrink-0"
                onMouseEnter={() => setActiveCategory(cat.id)}
                onMouseLeave={() => setActiveCategory(null)}
                onClick={() => {
                  if (cat.id === "all") {
                    // Scroll to product grid on homepage
                    const el = document.getElementById("product-grid");
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "start" });
                    } else {
                      router.push("/");
                    }
                  } else {
                    // Navigate to category page
                    router.push(`/category/${cat.id}`);
                  }
                }}
              >
                <span
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer select-none ${
                    activeCategory === cat.id
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400"
                  }`}
                >
                  <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
                  <span>{cat.name}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scrollBy("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all -mr-3"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Invisible bridge to cover the gap between pills and submenu */}
      {activeCat && activeCat.subcategories.length > 0 && (
        <div
          className="absolute left-0 right-0 z-20 h-2 -bottom-2"
          onMouseEnter={() => setActiveCategory(activeCat.id)}
        />
      )}

      {/* Submenu Panel */}
      {activeCat && activeCat.subcategories.length > 0 && (
        <div
          className="absolute left-0 right-0 z-20 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-4 animate-fadeIn"
          onMouseEnter={() => setActiveCategory(activeCat.id)}
          onMouseLeave={() => setActiveCategory(null)}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {activeCat.subcategories.map((sub) => (
              <SubcategoryItem
                key={sub.id || sub.name}
                name={sub.name}
                image={sub.image}
                onClick={() => router.push(`/category/${activeCat.id}?sub=${encodeURIComponent(sub.name)}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
