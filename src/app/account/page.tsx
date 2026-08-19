"use client";

import useSWR from "swr";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Package,
  ShoppingBag,
  LogOut,
  User as UserIcon,
  Loader2,
  IndianRupee,
  Clock,
  ChevronRight,
} from "lucide-react";
import { formatStatus, getStatusColor } from "@/lib/orderStatus";
import { useSession } from "next-auth/react";

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

interface SessionUser {
  name?: string;
  email?: string;
}

export default function AccountPage() {
  const router = useRouter();

  // Session info via useSession
  const { data: sessionData, status: sessionStatus } = useSession();

  // Order history via SWR (still needs /api/orders/my which is protected)
  const { data: orders, isLoading, error } = useSWR<Order[]>(
    "/api/orders/my",
    async (url) => {
      const res = await fetch(url);
      const data = await res.json() as ApiResponse<Order[]>;
      if (!data.success) {
        throw new Error(data.error || "Failed to load orders");
      }
      return data.data ?? [];
    },
    { revalidateOnFocus: true }
  );

  const user = sessionData?.user ?? null;
  const orderList = orders ?? [];
  const isLoadingOrders = isLoading;
  const errorMsg = error instanceof Error ? error.message : error ? String(error) : "";
  const recentOrders = orderList.slice(0, 3);

  async function handleLogout() {
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              My Account
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage your profile and track your orders
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Profile card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
              <UserIcon className="w-7 h-7 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {user?.name || "Customer"}
              </h2>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              Recent Orders
            </h2>
            <Link
              href="/orders"
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              View all
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoadingOrders ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            </div>
          ) : errorMsg ? (
            <p className="text-sm text-rose-500 text-center py-8">{errorMsg}</p>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">No orders yet</p>
              <Link
                href="/"
                className="inline-block mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Start shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order.orderId}
                  href={`/orders/${order.orderId}`}
                  className="block border border-slate-200 dark:border-slate-800 rounded-lg p-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
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
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {formatStatus(order.status)}
                    </span>
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
    </div>
  );
}