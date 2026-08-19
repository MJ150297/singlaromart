"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { getHeroSlides } from "@/lib/api/banners";
import { type CloudinaryImage } from "@/lib/schemas";

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  gradient: string;
  cta: string;
  image?: string | CloudinaryImage;
}

/** Resolve a string/Cloudinary image value to a usable src URL. */
function resolveImageSrc(image?: string | CloudinaryImage): string | null {
  if (!image) return null;
  if (typeof image === "string") return image;
  return image.secureUrl || image.url || image.transformations?.card || image.transformations?.thumbnail || null;
}

export function HeroCarousel() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch slides from the API
  useEffect(() => {
    getHeroSlides()
      .then((data) => {
        setSlides(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load hero slides:", err);
        setIsLoading(false);
      });
  }, []);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % Math.max(slides.length, 1));
  }, [slides.length]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + Math.max(slides.length, 1)) % Math.max(slides.length, 1));
  }, [slides.length]);

  // Auto-advance every 4 seconds
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [next, isPaused, slides.length]);

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl shadow-lg bg-slate-200 dark:bg-slate-800 min-h-[210px] md:min-h-[250px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (slides.length === 0) {
    return null;
  }

  const slide = slides[current];
  const imageSrc = resolveImageSrc(slide.image);

  return (
    <div
      className="relative overflow-hidden rounded-2xl shadow-lg"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Banner image background (when an image is set) */}
      {imageSrc && (
        <div className="absolute inset-0">
          <Image
            src={imageSrc}
            alt={slide.title || slide.badge || "Banner"}
            fill
            priority={current === 0}
            sizes="(max-width: 768px) 100vw, 1200px"
            className="object-cover"
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      {/* Content container — gradient background is kept as a fallback when no image, and sits on top of the image for readability */}
      <div
        className={`relative p-6 md:p-10 min-h-[210px] md:min-h-[250px] flex items-center transition-all duration-500 ${
          imageSrc ? "" : `bg-gradient-to-r ${slide.gradient}`
        }`}
      >
        <div className={`relative z-10 max-w-md space-y-2 ${imageSrc ? "text-white" : ""}`}>
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
            imageSrc ? "bg-black/30 text-white/90" : "bg-white/20 text-white/90"
          }`}>
            <Sparkles className="w-3 h-3" /> {slide.badge}
          </span>
          <h2 className="text-2xl md:text-4xl font-extrabold leading-tight">
            {slide.title}
          </h2>
          <p className="text-xs md:text-sm text-white/80 max-w-sm">
            {slide.subtitle}
          </p>
        </div>
      </div>

      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center backdrop-blur-sm transition-all"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center backdrop-blur-sm transition-all"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`rounded-full transition-all ${
                idx === current
                  ? "w-5 h-1.5 bg-white"
                  : "w-1.5 h-1.5 bg-white/50 hover:bg-white/70"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}