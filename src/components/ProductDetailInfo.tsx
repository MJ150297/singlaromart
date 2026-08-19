"use client";

import { useState } from "react";
import { Plus, Minus, ShoppingBag, ChevronDown } from "lucide-react";
import { Product, Variant } from "@/lib/schemas";
import { useAppDispatch, useAppSelector } from "@/store";
import { addToCart, updateQuantityByVariant, removeByVariantId } from "@/store/slices/cartSlice";

interface ProductDetailInfoProps {
  product: Product;
  onVariantChange?: (variant: Variant | null) => void;
}

export function ProductDetailInfo({ product, onVariantChange }: ProductDetailInfoProps) {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.items);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [descExpanded, setDescExpanded] = useState(true);

  const handleVariantSelect = (v: Variant) => {
    setSelectedVariant(v);
    onVariantChange?.(v);
  };

  // Build variants array: base product unit first, then actual variants.
  // Filter out any variant that duplicates the base product's unit (e.g. seed data).
  const allVariants = [
    {
      unit: product.unit,
      price: product.price,
      originalPrice: product.originalPrice ?? undefined,
      discountPercent: product.discountPercent ?? undefined,
      inStock: product.inStock,
      image: product.image,
    } as Variant,
    ...(product.variants || []).filter((v) => v.unit !== product.unit),
  ];

  // Find the active variant: use selectedVariant if set, otherwise use base product unit
  const activeVariant =
    selectedVariant?.unit === product.unit
      ? allVariants[0]
      : allVariants.find((v) => v.unit === selectedVariant?.unit) ||
        allVariants[0];

  const activePrice = activeVariant.price ?? product.price;
  const activeOriginalPrice =
    activeVariant.originalPrice ?? product.originalPrice ?? undefined;
  const activeDiscount = activeVariant.discountPercent ?? product.discountPercent ?? undefined;
  const activeUnit = activeVariant.unit ?? product.unit;

  // Find the cart item matching this product AND the currently selected variant
  const cartItem = cartItems.find(
    (item) => item.productId === product.id && item.variantId === selectedVariant?.unit
  );
  const qty = cartItem ? cartItem.quantity : 0;

  const handleAddToCart = () => {
    dispatch(
      addToCart({
        id: product.id,
        price: activePrice,
        name: product.name,
        unit: activeUnit,
        image: activeVariant?.image || product.image,
        variantId: selectedVariant?.unit,
      })
    );
  };

  return (
    <div className="space-y-5">
      {/* Badges */}
      {product.badges && product.badges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {product.badges.map((badge) => (
            <span
              key={badge}
              className="inline-flex items-center text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-200 dark:border-emerald-800"
            >
              {badge}
            </span>
          ))}
        </div>
      )}

      {/* Origin */}
      {product.origin && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="text-base">📍</span>
          <span>{product.origin}</span>
        </div>
      )}

      {/* Product Title */}
      <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
        {product.name}
      </h1>

      {/* Pricing */}
      <div className="space-y-1">
        <div className="flex items-baseline gap-3">
          <span className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            ₹{activePrice}
          </span>
          {activeOriginalPrice !== undefined && activeOriginalPrice > 0 && (
            <>
              <span className="text-sm md:text-base text-slate-400 line-through me-2">
                ₹{activeOriginalPrice}
              </span>
            </>
          )}
          {activeDiscount !== undefined && activeDiscount > 0 && (
            <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
              {activeDiscount}% OFF
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400">(Inclusive all taxes)</p>
      </div>

      {/* Unit Label with variant indicator */}
      <div className="text-sm text-slate-500 font-medium">
        <span className="text-slate-700 dark:text-slate-300 font-semibold">
          {activeUnit}
          {selectedVariant && selectedVariant.unit !== product.unit && (
            <span className="text-[10px] text-emerald-600 ml-1">(Variant)</span>
          )}
        </span>
      </div>

      {/* Variants Selector */}
      {allVariants.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Available Options
          </p>
          <div className="flex flex-wrap gap-2">
            {allVariants.map((v, index) => (
              <button
                key={v.unit + index}
                onClick={() => handleVariantSelect(v)}
                disabled={!v.inStock}
                className={`relative px-4 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                  v.unit === activeVariant.unit
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 shadow-sm"
                    : v.inStock
                    ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-emerald-400"
                    : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                }`}
              >
                <span className="block">{v.unit}</span>
                <span className="block text-[10px] mt-0.5 text-slate-400">
                  ₹{v.price}
                  {v.discountPercent !== undefined && v.discountPercent > 0 && (
                    <span className="text-rose-500 ml-1">-{v.discountPercent}%</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add to Cart / Stepper */}
      <div className="pt-2">
        {qty === 0 ? (
          <button
            onClick={handleAddToCart}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-6 rounded-xl font-bold text-sm transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            Add to Cart
          </button>
        ) : (
          <div className="flex items-center justify-between bg-emerald-600 text-white rounded-xl p-1 shadow-md">
            <button
              onClick={() =>
                qty === 1
                  ? dispatch(
                      removeByVariantId({
                        productId: product.id,
                        variantId: selectedVariant?.unit,
                      })
                    )
                  : dispatch(
                      updateQuantityByVariant({
                        productId: product.id,
                        variantId: selectedVariant?.unit,
                        quantity: qty - 1,
                      })
                    )
              }
              className="p-2.5 hover:bg-emerald-700 rounded-lg transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-300" />
              <span className="font-bold text-lg">{qty}</span>
              <span className="text-xs text-emerald-200">in cart</span>
            </div>
            <button
              onClick={() =>
                dispatch(
                  updateQuantityByVariant({
                    productId: product.id,
                    variantId: selectedVariant?.unit,
                    quantity: qty + 1,
                  })
                )
              }
              className="p-2.5 hover:bg-emerald-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Expandable Description */}
      {product.description && (
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
          <button
            onClick={() => setDescExpanded(!descExpanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <h5 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              Description
            </h5>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                descExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
          {descExpanded && (
            <div className="mt-3 space-y-4">
              {/* Description HTML */}
              <div
                className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />

              {/* Nutritional Info */}
              {product.nutritionalInfo && product.nutritionalInfo.length > 0 && (
                <div>
                  <h6 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                    Nutritional Highlights
                  </h6>
                  <ul className="space-y-1">
                    {product.nutritionalInfo.map((info, idx) => (
                      <li key={idx} className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
                        {info}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Storage Info */}
              {product.storageInfo && (
                <div>
                  <h6 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Storage Info
                  </h6>
                  <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
                    {product.storageInfo}
                  </p>
                </div>
              )}

              {/* Health Fact */}
              {product.healthFact && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg p-3">
                  <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">
                    💡 Health Fact
                  </p>
                  <p className="text-xs md:text-sm text-emerald-800 dark:text-emerald-300">
                    {product.healthFact}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}