"use client";

import { useEffect } from "react";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/store";
import {
  toggleCartDrawer,
  clearCart,
  removeByVariantId,
  updateQuantityByVariant,
} from "@/store/slices/cartSlice";
import { useState } from "react";
import { CheckoutModal } from "./CheckoutModal";
import type { CloudinaryImage } from "@/lib/schemas";

/** Extract a display URL from a string or a Cloudinary image object. */
function imageUrl(
  img?: string | CloudinaryImage
): string {
  if (!img) return "";
  if (typeof img === "string") return img;
  return img.secureUrl || img.url || img.transformations?.card || img.transformations?.thumbnail || "";
}

export function CartDrawer() {
  const dispatch = useAppDispatch();
  const { items, isOpen } = useAppSelector((state) => state.cart);
  const [showCheckout, setShowCheckout] = useState(false);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch(toggleCartDrawer(false));
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, dispatch]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity"
        onClick={() => dispatch(toggleCartDrawer(false))}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 z-50 shadow-2xl flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-green-600" />
            <h2 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              Your Cart ({items.length})
            </h2>
          </div>
          <button
            onClick={() => dispatch(toggleCartDrawer(false))}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
              <ShoppingBag className="h-12 w-12 mb-3" />
              <p className="text-sm font-medium">Your cart is empty</p>
              <p className="text-xs mt-1">Add items from the store</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={`${item.productId}-${item.variantId || "base"}`}
                className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl"
              >
                {/* Product Image */}
                <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {imageUrl(item.image) ? (
                    <img src={imageUrl(item.image)} alt={item.name} className="h-14 w-14 object-cover rounded-lg" />
                  ) : (
                    <span className="text-xl">🛒</span>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    ₹{item.price} / {item.unit}
                  </p>
                  {item.variantId && (
                    <p className="text-xs text-slate-400">
                      Variant: {item.variantId}
                    </p>
                  )}
                  <p className="text-sm font-bold text-green-600 mt-0.5">
                    ₹{item.price * item.quantity}
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      item.quantity === 1
                        ? dispatch(removeByVariantId({ productId: item.productId, variantId: item.variantId }))
                        : dispatch(
                            updateQuantityByVariant({
                              productId: item.productId,
                              variantId: item.variantId,
                              quantity: item.quantity - 1,
                            })
                          )
                    }
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                  >
                    <Minus className="h-3.5 w-3.5 text-slate-500" />
                  </button>

                  <span className="w-8 text-center text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {item.quantity}
                  </span>

                  <button
                    onClick={() =>
                      dispatch(
                        updateQuantityByVariant({
                          productId: item.productId,
                          variantId: item.variantId,
                          quantity: item.quantity + 1,
                        })
                      )
                    }
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                </div>

                {/* Remove */}
                <button
                  onClick={() => dispatch(removeByVariantId({ productId: item.productId, variantId: item.variantId }))}
                  className="p-1 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t dark:border-slate-800 px-4 py-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">
                Subtotal
              </span>
              <span className="font-bold text-lg text-slate-900 dark:text-slate-100">
                ₹{subtotal}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => dispatch(clearCart())}
                className="px-3 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setShowCheckout(true)}
                className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>

      {showCheckout && <CheckoutModal onClose={() => setShowCheckout(false)} />}
    </>
  );
}