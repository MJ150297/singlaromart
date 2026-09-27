"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Search, X, Download, Loader2, Trash2, IndianRupee, ShoppingCart,
  Clock, TrendingUp, CheckSquare, Square, Eye, MessageCircle,
  Filter, RefreshCw, AlertTriangle,
} from "lucide-react";
import { ORDER_STATUSES, PAYMENT_STATUSES, formatStatus, getStatusColor, getPaymentStatusColor } from "@/lib/orderStatus";
import { useToast } from "@/components/ui/toast";
import { Pagination } from "@/components/Pagination";
import { site } from "@/lib/site";

interface OrderItem { productId: string; variantId?: string; quantity: number; unitPrice: number; name?: string; unit?: string; image?: unknown; }
interface Customer { fullName: string; phoneNumber: string; address: string; landmark?: string; deliverySlot: string; paymentMethod: string; }
interface StatusHistoryEntry { status: string; changedAt: string; changedBy?: string; note?: string; }
interface Order {
  orderId: string; userId?: string; customer: Customer; items: OrderItem[];
  totalAmount: number; status: string; paymentStatus?: string; internalNotes?: string;
  deliveryNotes?: string; statusHistory?: StatusHistoryEntry[]; estimatedDelivery?: string;
  createdAt: string; updatedAt?: string;
}
interface Summary {
  totalOrders: number; totalRevenue: number; pendingCount: number; confirmedCount: number;
  outForDeliveryCount: number; deliveredCount: number; cancelledCount: number;
  paidCount: number; avgOrderValue: number;
}
interface OrdersResponse { items: Order[]; total: number; page: number; limit: number; summary: Summary; }
type ApiResponse<T> = { success: boolean; data?: T; error?: string };
const PAGE_SIZES = [10, 25, 50, 100];

export default function OrdersClient() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const { toast } = useToast();
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, paymentStatusFilter, paymentMethodFilter, dateFrom, dateTo, minAmount, maxAmount, sortBy, sortOrder, limit]);

  const params = new URLSearchParams({ page: String(page), limit: String(limit), sortBy, sortOrder });
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (paymentStatusFilter !== "all") params.set("paymentStatus", paymentStatusFilter);
  if (paymentMethodFilter !== "all") params.set("paymentMethod", paymentMethodFilter);
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);
  if (minAmount) params.set("minAmount", minAmount);
  if (maxAmount) params.set("maxAmount", maxAmount);

  const ordersKey = `/api/admin/orders?${params.toString()}`;
  const { data, isLoading, error, mutate } = useSWR<OrdersResponse | null>(
    ordersKey,
    async (url) => {
      const res = await fetch(url);
      const d = (await res.json()) as ApiResponse<OrdersResponse>;
      if (!d.success) throw new Error(d.error || "Failed to load orders");
      return d.data ?? null;
    },
    { revalidateOnFocus: true }
  );

  const orders = data?.items ?? [];
  const summary = data?.summary;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const showToast = useCallback((type: "success" | "error", message: string) => {
    toast[type](message);
  }, [toast]);

  const clearFilters = () => {
    setSearch(""); setStatusFilter("all"); setPaymentStatusFilter("all");
    setPaymentMethodFilter("all"); setDateFrom(""); setDateTo("");
    setMinAmount(""); setMaxAmount(""); setSortBy("createdAt"); setSortOrder("desc"); setPage(1);
  };

  const hasActiveFilters = debouncedSearch || statusFilter !== "all" || paymentStatusFilter !== "all" ||
    paymentMethodFilter !== "all" || dateFrom || dateTo || minAmount || maxAmount;

  const toggleSelect = (orderId: string) => {
    setSelected((prev) => prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]);
  };

  const toggleSelectAll = () => {
    if (selected.length === orders.length && orders.length > 0) setSelected([]);
    else setSelected(orders.map((o) => o.orderId));
  };

  const handleBulkStatus = async () => {
    if (!bulkStatus || selected.length === 0) return;
    setBulkLoading(true);
    try {
      const results = await Promise.all(selected.map((id) =>
        fetch(`/api/admin/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: bulkStatus }) })
      ));
      if (results.every((r) => r.ok)) {
        showToast("success", `Updated ${selected.length} order(s) to ${formatStatus(bulkStatus)}`);
        setSelected([]); setBulkStatus(""); await mutate();
      } else showToast("error", "Some orders failed to update");
    } catch { showToast("error", "Failed to update orders"); }
    finally { setBulkLoading(false); }
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    if (!confirm(`Delete ${selected.length} order(s)? This cannot be undone.`)) return;
    setBulkLoading(true);
    try {
      const results = await Promise.all(selected.map((id) => fetch(`/api/admin/orders/${id}`, { method: "DELETE" })));
      if (results.every((r) => r.ok)) {
        showToast("success", `Deleted ${selected.length} order(s)`);
        setSelected([]); await mutate();
      } else showToast("error", "Some orders failed to delete");
    } catch { showToast("error", "Failed to delete orders"); }
    finally { setBulkLoading(false); }
  };

  const handleExportCsv = async () => {
    try {
      const res = await fetch(`/api/admin/orders?${params.toString()}&export=csv`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
      a.click(); window.URL.revokeObjectURL(url);
      showToast("success", "CSV exported successfully");
    } catch { showToast("error", "Failed to export CSV"); }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
  const totalItems = (order: Order) => order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const kpiCards = useMemo(() => {
    if (!summary) return [];
    return [
      { label: "Total Orders", value: summary.totalOrders, icon: ShoppingCart, color: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400" },
      { label: "Total Revenue", value: formatCurrency(summary.totalRevenue), icon: IndianRupee, color: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400" },
      { label: "Pending", value: summary.pendingCount, icon: Clock, color: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400" },
      { label: "Avg Order Value", value: formatCurrency(summary.avgOrderValue), icon: TrendingUp, color: "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400" },
    ];
  }, [summary]);

  const inputClass = "w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100";
  const selectClass = `${inputClass} pr-8`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Orders</h1>
          <p className="text-sm text-slate-500 mt-1">Manage, track, and fulfill customer orders</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCsv} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => mutate()} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{card.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by order ID, customer name, or phone..." className={`${inputClass} pl-9`} />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${hasActiveFilters ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400" : "text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
            <Filter className="w-4 h-4" /> Filters
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors">
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
                <option value="all">All Statuses</option>
                {ORDER_STATUSES.map((s) => <option key={s} value={s}>{formatStatus(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Payment Status</label>
              <select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)} className={selectClass}>
                <option value="all">All Payments</option>
                {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{formatStatus(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Payment Method</label>
              <select value={paymentMethodFilter} onChange={(e) => setPaymentMethodFilter(e.target.value)} className={selectClass}>
                <option value="all">All Methods</option>
                <option value="Cash on Delivery">Cash on Delivery</option>
                <option value="UPI on Delivery">UPI on Delivery</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Sort By</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={selectClass}>
                <option value="createdAt">Date</option>
                <option value="totalAmount">Amount</option>
                <option value="customer.fullName">Customer Name</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Sort Order</label>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={selectClass}>
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">From Date</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">To Date</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Min ₹</label>
                <input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="0" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Max ₹</label>
                <input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="∞" className={inputClass} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selected.length > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{selected.length} selected</span>
          <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Bulk update status...</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{formatStatus(s)}</option>)}
          </select>
          <button onClick={handleBulkStatus} disabled={!bulkStatus || bulkLoading} className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1">
            {bulkLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Apply
          </button>
          <button onClick={handleBulkDelete} disabled={bulkLoading} className="px-3 py-1.5 text-sm font-medium text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <button onClick={() => setSelected([])} className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Cancel</button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">{error instanceof Error ? error.message : "Failed to load orders"}</p>
          <button onClick={() => mutate()} className="mt-3 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors">Retry</button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !data && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-2.5 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
                <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && orders.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No orders found</p>
          <p className="text-sm mt-1">{hasActiveFilters ? "Try adjusting your filters" : "Orders will appear here when customers place them"}</p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-3 px-4 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors">Clear Filters</button>
          )}
        </div>
      )}

      {/* Orders Table (Desktop) */}
      {!isLoading && !error && orders.length > 0 && (
        <>
          <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-3 w-10">
                    <button onClick={toggleSelectAll} className="text-slate-400 hover:text-emerald-600">
                      {selected.length === orders.length && orders.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Order</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Items</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Total</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Payment</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Date</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map((order) => (
                  <tr key={order.orderId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelect(order.orderId)} className="text-slate-400 hover:text-emerald-600">
                        {selected.includes(order.orderId) ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order.orderId}`} className="font-mono text-xs font-semibold text-emerald-600 hover:text-emerald-700">{order.orderId}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{order.customer?.fullName}</p>
                      <p className="text-xs text-slate-500">{order.customer?.phoneNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{totalItems(order)}</td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getPaymentStatusColor(order.paymentStatus || "pending")}`}>{formatStatus(order.paymentStatus || "pending")}</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">{order.customer?.paymentMethod}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>{formatStatus(order.status)}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/orders/${order.orderId}`} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors" title="View details">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <a href={`https://wa.me/${order.customer?.phoneNumber}?text=${encodeURIComponent(`Hi ${order.customer?.fullName}, regarding your order ${order.orderId} from ${site.name}.`)}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors" title="Contact on WhatsApp">
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Orders Cards (Mobile) */}
          <div className="md:hidden space-y-3">
            {orders.map((order) => (
              <div key={order.orderId} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/admin/orders/${order.orderId}`} className="font-mono text-xs font-semibold text-emerald-600">{order.orderId}</Link>
                    <p className="font-medium text-slate-900 dark:text-slate-100 mt-1">{order.customer?.fullName}</p>
                    <p className="text-xs text-slate-500">{order.customer?.phoneNumber}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>{formatStatus(order.status)}</span>
                    <button onClick={() => toggleSelect(order.orderId)} className="text-slate-400">
                      {selected.includes(order.orderId) ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatCurrency(order.totalAmount)}</p>
                    <p className="text-[10px] text-slate-400">{totalItems(order)} items · {formatDate(order.createdAt)}</p>
                  </div>
                  <Link href={`/admin/orders/${order.orderId}`} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">View →</Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total} orders</p>
            <div className="flex items-center gap-2">
              <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="px-2 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {PAGE_SIZES.map((size) => <option key={size} value={size}>{size} per page</option>)}
              </select>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}