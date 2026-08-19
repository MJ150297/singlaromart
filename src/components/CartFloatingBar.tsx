"use client";

import { ShoppingBag, ChevronRight } from "lucide-react";
import { useAppSelector } from "@/store";

interface CartFloatingBarProps {
  onCheckout: () => void;
}

export function CartFloatingBar({ onCheckout }: CartFloatingBarProps) {
  const { items } = useAppSelector((state) => state.cart);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (totalCount === 0) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-3 shadow-2xl md:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-emerald-600" />
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold">
              {totalCount} Item{totalCount > 1 ? "s" : ""} in Cart
            </p>
            <p className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              ₹{totalAmount}
            </p>
          </div>
        </div>
        <button
          onClick={onCheckout}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-colors"
        >
          <span>Checkout via WhatsApp</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      {/* Variant summary when items have variants */}
      {items.length > 0 && items.some(item => item.variantId) && (
        <div className="mt-2 text-xs text-slate-500">
          {items.filter(item => item.variantId).map((item) => (
            <div key={`${item.productId}-${item.variantId}`}>
              {item.variantId && <span>× {item.variantId}</span>}
              ₹{item.price}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}