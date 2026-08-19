"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Package,
  ShoppingBag,
  Loader2,
  IndianRupee,
  Clock,
  ChevronRight,
} from "lucide-react";
import { ORDER_STATUSES, formatStatus, getStatusColor } from "@/lib/orderStatus";

interface Order {
  orderId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    unit: string;
  }>;
}

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState("all");

  // SWR fetcher for authenticated endpoint
  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/orders/my");
    const data = await res.json() as ApiResponse<Order[]>;
    if (!data.success) {
      throw new Error(data.error || "Failed to load orders");
    }
    return data.data ?? [];
  }, []);

  const { data: orders, isLoading, error, mutate } = useSWR<Order[]>(
    "/api/orders/my",
    fetchOrders,
    { revalidateOnFocus: true }
  );

  const orderList = orders ?? [];
  const filteredOrders =
    statusFilter === "all"
      ? orderList
      : orderList.filter((order) => order.status === statusFilter);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              My Orders
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Track and review your order history
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Continue shopping
          </Link>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          {["all", ...ORDER_STATUSES].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === status
                  ? "bg-emerald-600 text-white"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {status === "all" ? "All" : formatStatus(status)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-sm text-rose-500">{error.message}</p>
            <button
              onClick={() => mutate()}
              className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Try again
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">
              {statusFilter === "all"
                ? "No orders yet"
                : `No ${formatStatus(statusFilter)} orders`}
            </p>
            <Link
              href="/"
              className="inline-block mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Link
                key={order.orderId}
                href={`/orders/${order.orderId}`}
                className="block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
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
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {formatStatus(order.status)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                  </div>
                </div>

                <div className="space-y-1.5 mb-3">
                  {order.items?.slice(0, 3).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-600 dark:text-slate-300">
                        {item.name} × {item.quantity}
                        {item.unit ? ` (${item.unit})` : ""}
                      </span>
                      <span className="text-slate-500">
                        ₹{(item.unitPrice * item.quantity).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                  {order.items && order.items.length > 3 && (
                    <p className="text-xs text-slate-400">
                      +{order.items.length - 3} more item
                      {order.items.length - 3 !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-500">
                    {order.items?.length || 0} item
                    {order.items?.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5" />
                    {order.totalAmount.toLocaleString("en-IN")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}