"use client";

import useSWR from "swr";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Package,
  Loader2,
  IndianRupee,
  Clock,
  MapPin,
  Smartphone,
  CreditCard,
  Calendar,
  ArrowLeft,
} from "lucide-react";
import { formatStatus, getStatusColor } from "@/lib/orderStatus";

interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
}

interface Order {
  orderId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  estimatedDelivery?: string;
  items: OrderItem[];
  customer: {
    fullName: string;
    phoneNumber: string;
    address: string;
    landmark?: string;
    deliverySlot: string;
    paymentMethod: string;
  };
}

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const { data: order, isLoading, error } = useSWR<Order | null>(
    orderId ? `/api/orders/my/${orderId}` : null,
    async (url) => {
      const res = await fetch(url);
      const data = await res.json() as ApiResponse<Order>;
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Order not found");
      }
      return data.data ?? null;
    },
    { revalidateOnFocus: true }
  );

  const errMsg = error instanceof Error ? error.message : error ? String(error) : "";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
            {errMsg || "Order not found"}
          </p>
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Orders
        </Link>

        {/* Order header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Order Details
            </h1>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {order.orderId}
              </span>
              <span>·</span>
              <Clock className="w-3.5 h-3.5" />
              {new Date(order.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(
              order.status
            )}`}
          >
            {formatStatus(order.status)}
          </span>
        </div>

        {/* Items */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 mb-4">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-emerald-600" />
            Items
          </h2>
          <div className="space-y-3">
            {order.items?.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-slate-600 dark:text-slate-300">
                  {item.name} × {item.quantity}
                  {item.unit ? ` (${item.unit})` : ""}
                </span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  ₹{(item.unitPrice * item.quantity).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Total
            </span>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
              <IndianRupee className="w-4 h-4" />
              {order.totalAmount.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Delivery details */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 mb-4">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Delivery Details
          </h2>
          <div className="space-y-3 text-sm">
            <p className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
              <span>
                {order.customer?.address}
                {order.customer?.landmark ? ` (${order.customer.landmark})` : ""}
              </span>
            </p>
            <p className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
              <Smartphone className="w-4 h-4 shrink-0 text-emerald-600" />
              {order.customer?.phoneNumber}
            </p>
            <p className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
              <Calendar className="w-4 h-4 shrink-0 text-emerald-600" />
              {order.customer?.deliverySlot}
            </p>
            {order.estimatedDelivery && (
              <p className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                <Clock className="w-4 h-4 shrink-0 text-emerald-600" />
                Est. delivery:{" "}
                {new Date(order.estimatedDelivery).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}
            <p className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
              <CreditCard className="w-4 h-4 shrink-0 text-emerald-600" />
              {order.customer?.paymentMethod}
            </p>
          </div>
        </div>

        {/* Continue shopping */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-block px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}