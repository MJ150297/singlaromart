"use client";

import { useState } from "react";
import useSWR from "swr";
import { ChevronDown, Loader2 } from "lucide-react";
import { ORDER_STATUSES, formatStatus, getStatusColor } from "@/lib/orderStatus";

interface Order {
  orderId: string;
  customer: {
    fullName: string;
    phoneNumber: string;
    address: string;
    deliverySlot: string;
    paymentMethod: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    unit: string;
  }>;
  totalAmount: number;
  status: string;
  createdAt: string;
}

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

interface OrdersListResponse {
  items: Order[];
}

const statusOptions = [...ORDER_STATUSES];

export default function AdminOrdersPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const ordersKey = `/api/admin/orders?status=${encodeURIComponent(statusFilter)}`;

  const { data: orders, isLoading, mutate } = useSWR<Order[]>(
    ordersKey,
    async (url) => {
      const res = await fetch(url);
      const data = (await res.json()) as ApiResponse<OrdersListResponse>;
      if (!data.success) {
        throw new Error(data.error || "Failed to load orders");
      }
      return data.data?.items ?? [];
    },
    { revalidateOnFocus: true }
  );

  const orderList = orders ?? [];

  async function handleStatusChange(orderId: string, newStatus: string) {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        await mutate();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Orders
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage customer orders and update status
        </p>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", ...statusOptions].map((status) => (
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
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orderList.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg font-medium">No orders found</p>
          <p className="text-sm mt-1">
            Orders will appear here when customers place them
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orderList.map((order) => (
            <div
              key={order.orderId}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
            >
              {/* Order Header */}
              <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {order.customer?.fullName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {order.orderId} · {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    ₹{order.totalAmount}
                  </span>
                  <div className="relative">
                    <select
                      value={order.status}
                      onChange={(e) =>
                        handleStatusChange(order.orderId, e.target.value)
                      }
                      disabled={updatingId === order.orderId}
                      className={`appearance-none text-xs font-semibold px-3 py-1.5 pr-8 rounded-lg border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>
                          {formatStatus(s)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-current opacity-60" />
                  </div>
                  {updatingId === order.orderId && (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  )}
                  <button
                    onClick={() =>
                      setExpandedOrder(
                        expandedOrder === order.orderId ? null : order.orderId
                      )
                    }
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    {expandedOrder === order.orderId ? "Hide" : "View"}
                  </button>
                </div>
              </div>

              {/* Order Details */}
              {expandedOrder === order.orderId && (
                <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-4">
                  {/* Items */}
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Items
                    </h3>
                    <div className="space-y-2">
                      {order.items?.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-slate-700 dark:text-slate-300">
                            {item.name} × {item.quantity}
                            {item.unit ? ` (${item.unit})` : ""}
                          </span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            ₹{item.unitPrice * item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Customer Details
                    </h3>
                    <div className="text-sm space-y-1 text-slate-600 dark:text-slate-400">
                      <p>📞 {order.customer?.phoneNumber}</p>
                      <p>📍 {order.customer?.address}</p>
                      <p>🕐 {order.customer?.deliverySlot}</p>
                      <p>💳 {order.customer?.paymentMethod}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}