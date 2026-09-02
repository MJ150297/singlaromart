"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, Trash2, MessageCircle, Printer, Save,
  AlertTriangle, CheckCircle2, XCircle, Clock, IndianRupee,
} from "lucide-react";
import { ORDER_STATUSES, PAYMENT_STATUSES, formatStatus, getStatusColor, getPaymentStatusColor } from "@/lib/orderStatus";
import { useToast } from "@/components/ui/toast";

interface OrderItem { productId: string; variantId?: string; quantity: number; unitPrice: number; name?: string; unit?: string; image?: unknown; }
interface Customer { fullName: string; phoneNumber: string; address: string; landmark?: string; deliverySlot: string; paymentMethod: string; }
interface StatusHistoryEntry { status: string; changedAt: string; changedBy?: string; note?: string; }
interface Order {
  orderId: string; userId?: string; customer: Customer; items: OrderItem[];
  totalAmount: number; status: string; paymentStatus?: string; internalNotes?: string;
  deliveryNotes?: string; statusHistory?: StatusHistoryEntry[]; estimatedDelivery?: string;
  createdAt: string; updatedAt?: string;
}
type ApiResponse<T> = { success: boolean; data?: T; error?: string };

export default function OrderDetailClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const [internalNotes, setInternalNotes] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  const { data: order, isLoading, error, mutate } = useSWR<Order | null>(
    `/api/admin/orders/${orderId}`,
    async (url) => {
      const res = await fetch(url);
      const d = (await res.json()) as ApiResponse<Order>;
      if (!d.success) throw new Error(d.error || "Failed to load order");
      return d.data ?? null;
    },
    { revalidateOnFocus: true }
  );

  // Sync notes state when order data loads
  useEffect(() => {
    if (order) {
      setInternalNotes(order.internalNotes || "");
      setDeliveryNotes(order.deliveryNotes || "");
    }
  }, [order]);

  const showToast = (type: "success" | "error", message: string) => {
    toast[type](message);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!order || newStatus === order.status) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const d = await res.json();
      if (d.success) {
        showToast("success", `Status updated to ${formatStatus(newStatus)}`);
        await mutate();
      } else {
        showToast("error", d.error || "Failed to update status");
      }
    } catch {
      showToast("error", "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentStatusChange = async (newStatus: string) => {
    if (!order || newStatus === order.paymentStatus) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: newStatus }),
      });
      const d = await res.json();
      if (d.success) {
        showToast("success", `Payment status updated to ${formatStatus(newStatus)}`);
        await mutate();
      } else {
        showToast("error", d.error || "Failed to update payment status");
      }
    } catch {
      showToast("error", "Failed to update payment status");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!order) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNotes, deliveryNotes }),
      });
      const d = await res.json();
      if (d.success) {
        showToast("success", "Notes saved");
        await mutate();
      } else {
        showToast("error", d.error || "Failed to save notes");
      }
    } catch {
      showToast("error", "Failed to save notes");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!order) return;
    if (!confirm(`Delete order ${order.orderId}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.orderId}`, { method: "DELETE" });
      const d = await res.json();
      if (d.success) {
        showToast("success", "Order deleted");
        router.push("/admin/orders");
      } else {
        showToast("error", d.error || "Failed to delete order");
      }
    } catch {
      showToast("error", "Failed to delete order");
    } finally {
      setDeleting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
  const totalItems = order?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const inputClass = "w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100";
  const selectClass = `${inputClass} pr-8`;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-64 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <p className="text-lg font-medium text-rose-600 dark:text-rose-400">
          {error instanceof Error ? error.message : "Failed to load order"}
        </p>
        <Link href="/admin/orders" className="inline-block mt-4 text-sm font-medium text-emerald-600 hover:text-emerald-700">
          ← Back to Orders
        </Link>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">{order.orderId}</h1>
            <p className="text-sm text-slate-500 mt-1">Placed on {formatDate(order.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Printer className="w-4 h-4" /> Print
          </button>
          <a
            href={`https://wa.me/${order.customer?.phoneNumber}?text=${encodeURIComponent(`Hi ${order.customer?.fullName}, regarding your order ${order.orderId} from Indiyano.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Order items & status */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Management */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Order Status</h2>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={order.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={saving}
                className={selectClass}
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>{formatStatus(s)}</option>
                ))}
              </select>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${getStatusColor(order.status)}`}>
                {formatStatus(order.status)}
              </span>
              {saving && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
            </div>

            {/* Status History Timeline */}
            {order.statusHistory && order.statusHistory.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Status History</h3>
                <div className="space-y-3">
                  {[...order.statusHistory].reverse().map((entry, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-1">
                        {entry.status === "cancelled" ? (
                          <XCircle className="w-4 h-4 text-rose-500" />
                        ) : entry.status === "delivered" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {formatStatus(entry.status)}
                          {entry.changedBy && <span className="text-xs text-slate-400 ml-1">by {entry.changedBy}</span>}
                        </p>
                        <p className="text-xs text-slate-500">{formatDate(entry.changedAt)}</p>
                        {entry.note && <p className="text-xs text-slate-400 mt-0.5">{entry.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Order Items ({totalItems} items)
            </h2>
            <div className="space-y-3">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                      {item.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                        {item.unit ? ` (${item.unit})` : ""}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 shrink-0">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Total Amount</span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                <IndianRupee className="w-4 h-4" /> {order.totalAmount.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Notes</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Internal Notes</label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={3}
                  placeholder="Add internal notes about this order..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Delivery Notes</label>
                <textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  rows={2}
                  placeholder="Add delivery instructions..."
                  className={inputClass}
                />
              </div>
              <button
                onClick={handleSaveNotes}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Notes
              </button>
            </div>
          </div>
        </div>

        {/* Right column - Customer & payment info */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Customer Details</h2>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-slate-500">Name</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{order.customer?.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Phone</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{order.customer?.phoneNumber}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Address</p>
                <p className="text-slate-700 dark:text-slate-300">{order.customer?.address}</p>
              </div>
              {order.customer?.landmark && (
                <div>
                  <p className="text-xs text-slate-500">Landmark</p>
                  <p className="text-slate-700 dark:text-slate-300">{order.customer.landmark}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500">Delivery Slot</p>
                <p className="text-slate-700 dark:text-slate-300">{order.customer?.deliverySlot}</p>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Payment</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500">Method</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{order.customer?.paymentMethod}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Payment Status</p>
                <div className="flex items-center gap-2">
                  <select
                    value={order.paymentStatus || "pending"}
                    onChange={(e) => handlePaymentStatusChange(e.target.value)}
                    disabled={saving}
                    className={selectClass}
                  >
                    {PAYMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>{formatStatus(s)}</option>
                    ))}
                  </select>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getPaymentStatusColor(order.paymentStatus || "pending")}`}>
                    {formatStatus(order.paymentStatus || "pending")}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500">Estimated Delivery</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{formatDate(order.estimatedDelivery)}</p>
              </div>
            </div>
          </div>

          {/* Order Meta */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Order Info</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Order ID</span>
                <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">{order.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Created</span>
                <span className="text-slate-700 dark:text-slate-300">{formatDate(order.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Last Updated</span>
                <span className="text-slate-700 dark:text-slate-300">{formatDate(order.updatedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">User ID</span>
                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{order.userId || "Guest"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}