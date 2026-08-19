"use client";

import Image from "next/image";
import React from "react";
import { Package } from "lucide-react";
import { CloudinaryImage } from "@/lib/schemas";

interface ProductImageProps {
  image?: string | CloudinaryImage;
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

export default function ProductImage({ image, alt = "", className = "", sizes, priority = false }: ProductImageProps) {
  const [hasError, setHasError] = React.useState(false);

  const src = React.useMemo(() => {
    if (!image) return null;
    if (typeof image === "string") return image;
    // CloudinaryImage — prefer the raw secure URL, fall back to transformations
    return image.secureUrl || image.url || image.transformations?.card || image.transformations?.thumbnail || null;
  }, [image]);

  // Reset error state when the image source changes
  // Use queueMicrotask to avoid calling setState synchronously within the effect body
  React.useEffect(() => {
    if (src) {
      queueMicrotask(() => {
        setHasError(false);
      });
    }
  }, [src]);

  if (!src || hasError) {
    return (
      <div className={`relative overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-800 ${className}`}>
        <Package className="w-1/3 h-1/3 text-slate-300 dark:text-slate-600" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Using next/image with fill so parent must be sized (w/h or aspect) */}
      { }
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover"
        priority={priority}
        onError={() => setHasError(true)}
      />
    </div>
  );
}