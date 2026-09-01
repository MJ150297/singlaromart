"use client";

import Link from "next/link";
import { IndianRupee, Clock, ChevronRight, Repeat, MessageCircle } from "lucide-react";
import { formatStatus, getStatusColor } from "@/lib/orderStatus";
import { useAppDispatch } from "@/store";
import { addToCart, toggleCartDrawer } from "@/store/slices/cartSlice";
import ProductImage from "./ProductImage";
import { generateWhatsAppHelpUrl } from "@/lib/whatsapp";

export interface OrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  name?: string;
  unit?: string;
  image?: unknown;
}

export interface Order {
  orderId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  estimatedDelivery?: string;
  items: OrderItem[];
  customer?: {
    fullName?: string;
    phoneNumber?: string;
    address?: string;
    landmark?: string;
    deliverySlot?: string;
    paymentMethod?: string;
  };
}

const STEPS = ["pending", "confirmed", "out_for_delivery", "delivered"] as const;

interface OrderCardProps {
  order: Order;
  onReorder?: (order: Order) => void;
}

export function OrderCard({ order, onReorder }: OrderCardProps) {
  const dispatch = useAppDispatch();
  const thums = order.items?.slice(0, 4) || [];
  const extra = (order.items?.length || 0) - thums.length;
  const totalItems = order.items?.reduce((a, i) => a + i.quantity, 0) || 0;

  function reorder(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (onReorder) {
      onReorder(order);
      return;
    }
    order.items?.forEach((it) =>
      dispatch(
        addToCart({
          id: it.productId,
          variantId: it.variantId,
          quantity: it.quantity,
          price: it.unitPrice,
          name: it.name || "Item",
          unit: it.unit || "",
          image: it.image as never,
        })
      )
    );
    dispatch(toggleCartDrawer(true));
  }

  function help(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    window.open(generateWhatsAppHelpUrl(order.orderId), "_blank");
  }

  return (
    <Link
      href={`/orders/${order.orderId}`}
      className="block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {order.orderId}
          </p>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getStatusColor(
            order.status
          )}`}
        >
          {formatStatus(order.status)}
        </span>
      </div>

      <div className="px-4">
        <Stepper status={order.status} />
      </div>

      <div className="px-4 py-3 flex gap-4">
        {thums.length > 0 && (
          <div className="flex -space-x-2 shrink-0">
            {thums.map((it, i) => (
              <div
                key={i}
                className="w-10 h-10 rounded-lg border-2 border-white dark:border-slate-900 overflow-hidden bg-slate-100 dark:bg-slate-800"
              >
                <ProductImage
                  image={it.image as never}
                  alt={it.name || "Item"}
                  className="w-full h-full"
                  sizes="40px"
                />
              </div>
            ))}
            {extra > 0 && (
              <div className="w-10 h-10 rounded-lg border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">
                +{extra}
              </div>
            )}
          </div>
        )}
        <div className="min-w-0">
          {order.items?.slice(0, 3).map((it, i) => (
            <p
              key={i}
              className="text-xs text-slate-600 dark:text-slate-300 truncate"
            >
              {it.name} × {it.quantity}
              {it.unit ? ` (${it.unit})` : ""}
            </p>
          ))}
          {order.items && order.items.length > 3 && (
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              +{order.items.length - 3} more items
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
            <IndianRupee className="w-3.5 h-3.5" />
            {order.totalAmount.toLocaleString("en-IN")}
          </span>
          <span className="text-[10px] text-slate-400">
            {order.customer?.paymentMethod || "Payment pending"}
            {order.customer?.deliverySlot
              ? ` · ${order.customer.deliverySlot}`
              : ""}
          </span>
          <span className="mt-1 inline-flex w-fit rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            {totalItems} item{totalItems !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-1 text-[11px] font-semibold text-emerald-600">Details</span>
          <button
            onClick={help}
            title="Need help?"
            className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
          <button
            onClick={reorder}
            title="Reorder"
            className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Repeat className="w-4 h-4" />
          </button>
          <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
        </div>
      </div>
    </Link>
  );
}

function Stepper({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 mt-3">
        <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">✕</span>
        <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 capitalize">Order Cancelled</span>
      </div>
    );
  }
  const activeIdx = Math.max(0, STEPS.indexOf(status as (typeof STEPS)[number]));
  return (
    <div className="flex items-center mt-3">
      {STEPS.map((s, i) => {
        const reached = i <= activeIdx;
        const last = i === STEPS.length - 1;
        return (
          <div key={s} className={`flex items-center ${last ? "" : "flex-1"}`}>
            <div className="flex flex-col items-center">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${reached ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-400"}`}>
                {reached ? "✓" : i + 1}
              </span>
              <span className={`mt-1 hidden sm:block text-[9px] font-medium ${reached ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                {["Placed", "Confirmed", "Out for delivery", "Delivered"][i]}
              </span>
            </div>
            {!last && <div className={`flex-1 h-0.5 mx-1 mb-0 rounded ${i < activeIdx ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`} />}
          </div>
        );
      })}
    </div>
  );
}
