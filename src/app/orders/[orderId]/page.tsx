"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Calendar, Check, Clock, CreditCard, IndianRupee, Loader2, MapPin, Package, Repeat, Smartphone } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { DeliveryBar } from "@/components/DeliveryBar";
import { Header } from "@/components/Header";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { CartFloatingBar } from "@/components/CartFloatingBar";
import { CartDrawer } from "@/components/CartDrawer";
import { CheckoutModal } from "@/components/CheckoutModal";
import { Order } from "@/components/OrderCard";
import { useAppDispatch } from "@/store";
import { addToCart, toggleCartDrawer } from "@/store/slices/cartSlice";
import { formatStatus, getStatusColor } from "@/lib/orderStatus";

type ApiResponse<T> = { success: boolean; data?: T; error?: string };
const fetcher = async (url: string) => { const response = await fetch(url); const body = await response.json() as ApiResponse<Order>; if (!response.ok || !body.success) throw new Error(body.error || "Order not found"); return body.data ?? null; };
const steps = [{ key: "pending", label: "Placed" }, { key: "confirmed", label: "Confirmed" }, { key: "out_for_delivery", label: "Out for delivery" }, { key: "delivered", label: "Delivered" }];

export default function OrderDetailPage() { return <RequireAuth><OrderDetailContent /></RequireAuth>; }
function OrderDetailContent() {
  const params = useParams<{ orderId: string }>(); const orderId = params.orderId; const dispatch = useAppDispatch();
  const [searchQuery, setSearchQuery] = useState(""); const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const { data: order, isLoading, error } = useSWR<Order | null>(orderId ? `/api/orders/my/${orderId}` : null, fetcher, {
    refreshInterval: (data) =>
      data && !["delivered", "cancelled"].includes(data.status) ? 15_000 : 0,
  });
  if (isLoading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950"><DeliveryBar /><Header searchQuery={searchQuery} onSearchChange={setSearchQuery} /><div className="flex min-h-[50vh] items-center justify-center px-4 pt-4"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div></div>;
  if (error || !order) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950"><DeliveryBar /><Header searchQuery={searchQuery} onSearchChange={setSearchQuery} /><div className="px-4 py-16 text-center dark:bg-slate-950"><Package className="mx-auto mb-3 h-12 w-12 text-slate-300" /><p className="text-sm text-slate-600">{error instanceof Error ? error.message : "Order not found"}</p><Link href="/orders" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-600"><ArrowLeft className="h-4 w-4" /> Back to My Orders</Link></div></div>;
  const active = steps.findIndex((step) => step.key === order.status); const cancelled = order.status === "cancelled";
  function reorder() { order!.items.forEach((item) => dispatch(addToCart({ id: item.productId, variantId: item.variantId, quantity: item.quantity, price: item.unitPrice, name: item.name || "Item", unit: item.unit || "", image: item.image as never }))); dispatch(toggleCartDrawer(true)); }
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 md:pb-12 text-slate-900 dark:text-slate-100">
      <DeliveryBar />
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <div className="mx-auto max-w-2xl px-4 py-8"><Link href="/orders" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="h-4 w-4" /> Back to My Orders</Link><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Order Details</h1><p className="mt-1 text-sm text-slate-500">{order.orderId} · {new Date(order.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(order.status)}`}>{formatStatus(order.status)}</span></div>
    <section className="mb-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-5 font-semibold">Order tracking</h2>{cancelled ? <p className="font-semibold text-rose-600">Order cancelled</p> : <div className="flex items-start">{steps.map((step, index) => { const reached = index <= active; return <div key={step.key} className={`flex flex-1 flex-col items-center text-center ${index < steps.length - 1 ? "" : "flex-none"}`}><div className="flex w-full items-center"><span className={`mx-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${reached ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400 dark:bg-slate-700"}`}>{reached ? <Check className="h-4 w-4" /> : index + 1}</span>{index < steps.length - 1 && <span className={`h-0.5 w-full ${index < active ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`} />}</div><span className={`mt-2 text-[10px] font-medium ${reached ? "text-emerald-600" : "text-slate-400"}`}>{step.label}</span></div>})}</div>}</section>
    <section className="mb-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><Package className="h-5 w-5 text-emerald-600" /> Items</h2><button onClick={reorder} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"><Repeat className="h-4 w-4" /> Reorder</button></div>{order.items.map((item, index) => <div key={`${item.productId}-${index}`} className="flex items-center justify-between border-b border-slate-100 py-3 text-sm last:border-0 dark:border-slate-800"><span className="text-slate-600 dark:text-slate-300">{item.name || "Item"} × {item.quantity}{item.unit ? ` (${item.unit})` : ""}</span><span className="font-medium">₹{(item.unitPrice * item.quantity).toLocaleString("en-IN")}</span></div>)}<div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 font-bold dark:border-slate-800"><span>Total</span><span className="inline-flex items-center gap-1"><IndianRupee className="h-4 w-4" />{order.totalAmount.toLocaleString("en-IN")}</span></div></section>
    <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-4 font-semibold">Delivery details</h2><div className="space-y-3 text-sm text-slate-600 dark:text-slate-400"><p className="flex gap-3"><MapPin className="h-4 w-4 shrink-0 text-emerald-600" />{order.customer?.address}{order.customer?.landmark ? ` (${order.customer.landmark})` : ""}</p><p className="flex gap-3"><Smartphone className="h-4 w-4 shrink-0 text-emerald-600" />{order.customer?.phoneNumber}</p><p className="flex gap-3"><Calendar className="h-4 w-4 shrink-0 text-emerald-600" />{order.customer?.deliverySlot}</p>{order.estimatedDelivery && <p className="flex gap-3"><Clock className="h-4 w-4 shrink-0 text-emerald-600" />Est. delivery: {new Date(order.estimatedDelivery).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}</p>}<p className="flex gap-3"><CreditCard className="h-4 w-4 shrink-0 text-emerald-600" />{order.customer?.paymentMethod}</p></div></section>
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
