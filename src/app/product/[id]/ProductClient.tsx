"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { Product, Variant } from "@/lib/schemas";
import { DeliveryBar } from "@/components/DeliveryBar";
import { Header } from "@/components/Header";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductDetailInfo } from "@/components/ProductDetailInfo";
import { RelatedProducts } from "@/components/RelatedProducts";
import { CartFloatingBar } from "@/components/CartFloatingBar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { CartDrawer } from "@/components/CartDrawer";
import { CheckoutModal } from "@/components/CheckoutModal";
import { fetchApi } from "@/lib/swr";

interface ProductClientProps {
  productId: string;
  initialProduct: Product | null;
}

export default function ProductClient({
  productId,
  initialProduct,
}: ProductClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  const { data: product, error, isLoading } = useSWR<Product | null>(
    `/products/${productId}`,
    (url) => fetchApi<Product>(url),
    { fallbackData: initialProduct }
  );

  // Loading state — only when no initial data AND still fetching
  if (isLoading && !product) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <DeliveryBar />
        <Header searchQuery="" onSearchChange={() => {}} />
        <div className="container mx-auto px-4 pt-4 flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Loading product details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Product not found
  if (!product || error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <DeliveryBar />
        <Header searchQuery="" onSearchChange={() => {}} />
        <main className="container mx-auto px-4 pt-4">
          <div className="text-center py-20">
            <p className="text-lg font-medium text-slate-600 dark:text-slate-400">
              Product not found
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Gallery images: if a variant with an image is selected, show it first,
  // then fall back to the product gallery, then the main product image.
  const baseImages =
    product.images && product.images.length > 0 ? product.images : [product.image];
  const images =
    selectedVariant?.image && baseImages.some((img) => img !== selectedVariant.image)
      ? [selectedVariant.image, ...baseImages]
      : baseImages;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 md:pb-12 text-slate-900 dark:text-slate-100">
      {/* Delivery Bar */}
      <DeliveryBar />

      {/* Header */}
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <main className="container mx-auto px-4 pt-4 space-y-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-400">
          <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-600 dark:text-slate-300 font-medium truncate">
            {product.name}
          </span>
        </nav>

        {/* Product Detail Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          {/* Left: Gallery */}
          <div>
            <ProductGallery images={images} name={product.name} />
          </div>

          {/* Right: Product Info */}
          <div>
            <ProductDetailInfo
              product={product}
              onVariantChange={(v) => setSelectedVariant(v)}
            />
          </div>
        </div>

        {/* Related Products */}
        <RelatedProducts productId={product.id} category={product.category} />
      </main>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav />

      {/* Mobile Floating Cart Bar */}
      <CartFloatingBar onCheckout={() => setIsCheckoutOpen(true)} />

      {/* Cart Drawer */}
      <CartDrawer />

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <CheckoutModal onClose={() => setIsCheckoutOpen(false)} />
      )}
    </div>
  );
}