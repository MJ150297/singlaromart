"use client";

import Link from "next/link";
import { Plus, Minus } from "lucide-react";
import { Product } from "@/lib/schemas";
import ProductImage from "./ProductImage";
import { useAppDispatch, useAppSelector } from "@/store";
import { addToCart, updateQuantity } from "@/store/slices/cartSlice";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.items);
  // ProductCard adds the base product (no variant), so only match items without a variantId
  const cartItem = cartItems.find(
    (item) => item.productId === product.id && !item.variantId
  );
  const qty = cartItem ? cartItem.quantity : 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col hover:shadow-md transition-shadow relative h-full overflow-hidden min-w-0">
      {/* Clickable area - image + name link to PDP */}
      <Link href={`/product/${product.id}`} className="flex-1 flex flex-col min-w-0">
        {/* Image */}
        <div className="flex flex-col min-w-0">
          <ProductImage
            image={product.image}
            alt={product.name}
            className="w-full h-32 mb-2 bg-slate-100 dark:bg-slate-800 rounded-lg"
          />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
            {product.unit}
          </span>
          <h4 className="font-semibold text-xs md:text-sm text-slate-900 dark:text-slate-100 line-clamp-2 mt-0.5 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors min-h-[2em] leading-tight break-words flex-1">
            {product.name}
          </h4>
        </div>
      </Link>

      {/* Price & Stepper Control */}
      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="space-y-0.5">
          <span className="text-xs md:text-sm font-bold text-slate-900 dark:text-slate-100">
            ₹{product.price}
          </span>
          {/* Fixed-height container to keep all cards aligned regardless of discount presence */}
          <div className="h-[16px]">
            {product.originalPrice && product.originalPrice > product.price && (
              <div>
                <span className="text-[10px] text-slate-400 line-through">
                  ₹{product.originalPrice}
                </span>
                {product.discountPercent && product.discountPercent > 0 && (
                  <span className="text-[9px] font-bold text-rose-500 ml-1">
                    {product.discountPercent}% off
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stepper: Show +/- when in cart, show Add button when not */}
        {qty === 0 ? (
          <button
            onClick={() =>
              dispatch(
                addToCart({
                  id: product.id,
                  price: product.price,
                  name: product.name,
                  unit: product.unit,
                  image: product.image,
                })
              )
            }
            className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        ) : (
          <div className="flex items-center bg-emerald-600 text-white rounded-lg p-0.5">
            <button
              onClick={() =>
                dispatch(
                  updateQuantity({
                    id: product.id,
                    quantity: qty - 1,
                  })
                )
              }
              className="p-1 hover:bg-emerald-700 rounded-md transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="px-2 text-xs font-bold min-w-[20px] text-center">
              {qty}
            </span>
            <button
              onClick={() =>
                dispatch(
                  updateQuantity({
                    id: product.id,
                    quantity: qty + 1,
                  })
                )
              }
              className="p-1 hover:bg-emerald-700 rounded-md transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}