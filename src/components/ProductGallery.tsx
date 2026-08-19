"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductImage from "./ProductImage";
import { CloudinaryImage } from "@/lib/schemas";

interface ProductGalleryProps {
  images: Array<string | CloudinaryImage>;
  name: string;
}

export function ProductGallery({ images, name }: ProductGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const displayImages = images.length > 0 ? images : ["/images/placeholder.jpg"];
  const currentImage = displayImages[currentIndex];

  // Reset to the first image whenever the actual images change (e.g. variant switch).
  // Use a serialized key instead of the array reference so re-renders with the
  // same set of images don't reset the user's position.
  const imageKey = displayImages
    .map((img) =>
      typeof img === "string"
        ? img
        : img.secureUrl || img.url || ""
    )
    .join("|");

  // Adjust state during render (React-recommended pattern) — resets the gallery
  // whenever the image set actually changes, without an effect.
  const [prevImageKey, setPrevImageKey] = useState(imageKey);
  if (imageKey !== prevImageKey) {
    setPrevImageKey(imageKey);
    setCurrentIndex(0);
  }

  const goTo = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, displayImages.length - 1)));
  };

  return (
    <div className="space-y-3">
      {/* Main Image + Navigation arrows in a relative container */}
      <div className="relative">
        <ProductImage image={currentImage} alt={name} className="w-full aspect-square bg-slate-100 dark:bg-slate-800 rounded-2xl" />

        {/* Navigation arrows */}
        {displayImages.length > 1 && (
          <>
            <button
              onClick={() => goTo(currentIndex - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shadow-md transition-all"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => goTo(currentIndex + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shadow-md transition-all"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Dot indicators */}
      {displayImages.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          {displayImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className={`rounded-full transition-all ${
                idx === currentIndex
                  ? "w-6 h-2 bg-emerald-600"
                  : "w-2 h-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400"
              }`}
              aria-label={`View image ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}