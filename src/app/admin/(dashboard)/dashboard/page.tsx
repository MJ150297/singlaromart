"use client";

import useSWR from "swr";
import Link from "next/link";
import {
  Package,
  ShoppingCart,
  IndianRupee,
  Clock,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

interface RecentOrder {
  orderId: string;
  customer?: { fullName?: string };
  items?: unknown[];
  totalAmount: number;
  status: string;
}

interface LowStockProduct {
  id: string;
  name: string;
  unit: string;
  stockQuantity?: number;
}

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalCategories: number;
  totalBanners: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
  recentOrders: RecentOrder[];
  lowStockProducts: LowStockProduct[];
}

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

export default function AdminDashboardPage() {
  const { data: stats, isLoading, error } = useSWR<Stats | null>(
    "/api/admin/stats",
    async (url) => {
      const res = await fetch(url);
      const data = await res.json() as ApiResponse<Stats>;
      if (!data.success) {
        throw new Error(data.error || "Failed to load stats");
      }
      return data.data ?? null;
    },
    { revalidateOnFocus: true }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-rose-500">
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Products",
      value: stats?.totalProducts ?? 0,
      icon: Package,
      color: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400",
      href: "/admin/products",
    },
    {
      label: "Total Orders",
      value: stats?.totalOrders ?? 0,
      icon: ShoppingCart,
      color: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400",
      href: "/admin/orders",
    },
    {
      label: "Total Revenue",
      value: `₹${(stats?.totalRevenue ?? 0).toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
      href: "/admin/orders",
    },
    {
      label: "Pending Orders",
      value: stats?.pendingOrders ?? 0,
      icon: Clock,
      color: "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400",
      href: "/admin/orders",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Overview of your store&#39;s performance
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {card.value}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
              Recent Orders
            </h2>
            <Link
              href="/admin/orders"
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {stats?.recentOrders?.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              No orders yet
            </p>
          ) : (
            <div className="space-y-3">
              {stats?.recentOrders?.map((order) => (
                <div
                  key={order.orderId}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {order.customer?.fullName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {order.orderId} · {order.items?.length} items
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      ₹{order.totalAmount}
                    </p>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        order.status === "delivered"
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                          : order.status === "cancelled"
                          ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400"
                          : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
              Low Stock Alerts
            </h2>
            <Link
              href="/admin/products"
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
            >
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {stats?.lowStockProducts?.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              All products are well stocked
            </p>
          ) : (
            <div className="space-y-3">
              {stats?.lowStockProducts?.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-slate-500">{product.unit}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 shrink-0">
                    {product.stockQuantity ?? 0} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}