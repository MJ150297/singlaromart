"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Package, Search } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { DeliveryBar } from "@/components/DeliveryBar";
import { Header } from "@/components/Header";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { CartFloatingBar } from "@/components/CartFloatingBar";
import { CartDrawer } from "@/components/CartDrawer";
import { CheckoutModal } from "@/components/CheckoutModal";
import { OrderCard, Order } from "@/components/OrderCard";
import { SkeletonOrderCard } from "@/components/Skeletons";
import { ORDER_STATUSES, formatStatus } from "@/lib/orderStatus";

type ApiResponse<T> = { success: boolean; data?: T; error?: string };
const fetcher = async (url: string) => { const response = await fetch(url); const body = await response.json() as ApiResponse<Order[]>; if (!response.ok || !body.success) throw new Error(body.error || "Unable to load orders"); return body.data ?? []; };

export default function OrdersPage() { return <RequireAuth><OrdersContent /></RequireAuth>; }
function OrdersContent() {
  const { data: orders, isLoading, error, mutate } = useSWR<Order[]>("/api/orders/my", fetcher);
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("all"); const [sort, setSort] = useState("newest");
  const [searchQuery, setSearchQuery] = useState(""); const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const list = useMemo(() => orders ?? [], [orders]);
  const counts = Object.fromEntries(ORDER_STATUSES.map((key) => [key, list.filter((order) => order.status === key).length]));
  const filtered = useMemo(() => list.filter((order) => { const matchesStatus = status === "all" || order.status === status; const q = query.trim().toLowerCase(); const matchesQuery = !q || order.orderId.toLowerCase().includes(q) || order.items.some((item) => (item.name || "").toLowerCase().includes(q)); return matchesStatus && matchesQuery; }).sort((a,b) => sort === "oldest" ? +new Date(a.createdAt) - +new Date(b.createdAt) : sort === "high" ? b.totalAmount - a.totalAmount : sort === "low" ? a.totalAmount - b.totalAmount : +new Date(b.createdAt) - +new Date(a.createdAt)), [list, query, status, sort]);
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 md:pb-12 text-slate-900 dark:text-slate-100">
      <DeliveryBar />
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <div className="mx-auto max-w-4xl px-4 py-8"><div className="mb-6 flex items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Orders</h1><p className="mt-1 text-sm text-slate-500">Track and review your order history</p></div><Link href="/" className="text-sm font-medium text-emerald-600">Continue shopping</Link></div>
    <div className="mb-4 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search order ID or item name" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-800 dark:bg-slate-900" /></label><select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="high">Amount high → low</option><option value="low">Amount low → high</option></select></div>
    <div className="mb-6 flex gap-2 overflow-x-auto pb-1"><button onClick={() => setStatus("all")} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${status === "all" ? "bg-emerald-600 text-white" : "bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}>All ({list.length})</button>{ORDER_STATUSES.map((key) => <button key={key} onClick={() => setStatus(key)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${status === key ? "bg-emerald-600 text-white" : "bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}>{formatStatus(key)} ({counts[key]})</button>)}</div>
    {isLoading ? <div className="space-y-4"><SkeletonOrderCard /><SkeletonOrderCard /><SkeletonOrderCard /></div> : error ? <div className="py-16 text-center text-sm text-rose-500">{error.message}<button onClick={() => mutate()} className="ml-2 text-emerald-600">Try again</button></div> : filtered.length ? <div className="space-y-4">{filtered.map((order) => <OrderCard key={order.orderId} order={order} />)}</div> : <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-700"><Package className="mx-auto mb-3 h-12 w-12 text-slate-300" /><p className="text-sm text-slate-500">{list.length ? "No orders match your filters" : "No orders yet"}</p><div className="mt-4 flex justify-center gap-2"><Link href="/search?q=groceries" className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">Groceries</Link><Link href="/search" className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">Search products</Link></div><Link href="/" className="mt-4 inline-block text-sm font-semibold text-emerald-600">Start shopping</Link></div>}
  </div>
      <MobileBottomNav />
      <CartFloatingBar onCheckout={() => setIsCheckoutOpen(true)} />
      <CartDrawer />
      {isCheckoutOpen && (
        <CheckoutModal onClose={() => setIsCheckoutOpen(false)} />
      )}
    </div>
  );
}
