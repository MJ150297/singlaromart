"use client";

import Link from "next/link";
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Clock, IndianRupee, Package, ShoppingCart, TrendingUp } from "lucide-react";
import ProductImage from "@/components/ProductImage";
import type { CloudinaryImage } from "@/lib/schemas";

export type DashboardStats = {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  paidRevenue: number;
  avgOrderValue: number;
  pendingOrders: number;
  totalCustomers: number;
  customers?: number;
  recentOrders: Array<{ orderId: string; customer?: { fullName?: string }; items?: unknown[]; totalAmount: number; status: string }>;
  lowStockProducts: Array<{ id: string; name: string; unit: string; stockQuantity?: number; image?: unknown }>;
  selectedTimeSeries: Array<{ date: string; revenue: number; orderCount: number }>;
  orderStatusBreakdown: Array<{ status: string; count: number }>;
  paymentMethodBreakdown: Array<{ method: string; count: number; revenue: number }>;
  topCategories: Array<{ name: string; units: number }>;
  topProducts: Array<{ name: string; unit: string; units: number; revenue: number }>;
};

const currency = (value: number) => `₹${Math.round(value || 0).toLocaleString("en-IN")}`;
const statusLabel = (status: string) => status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
const statusColors: Record<string, string> = { pending: "#f59e0b", confirmed: "#3b82f6", out_for_delivery: "#8b5cf6", delivered: "#10b981", cancelled: "#f43f5e" };
const pieColors = ["#059669", "#2563eb", "#f59e0b", "#8b5cf6", "#f43f5e"];

function Panel({ title, action, children, className = "" }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  const id = `${title.toLowerCase().replaceAll(" ", "-")}-heading`;
  return <section className={`rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 ${className}`} aria-labelledby={id}><div className="mb-4 flex items-center justify-between gap-3"><h2 id={id} className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2>{action}</div>{children}</section>;
}

export function DashboardSkeleton() {
  return <div className="animate-pulse space-y-6" aria-label="Loading dashboard" role="status"><div className="h-8 w-48 rounded bg-slate-200 dark:bg-slate-800" /><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-slate-200 dark:bg-slate-800" />)}</div><div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><div className="h-80 rounded-xl bg-slate-200 dark:bg-slate-800" /><div className="h-80 rounded-xl bg-slate-200 dark:bg-slate-800" /></div><span className="sr-only">Loading dashboard data</span></div>;
}

export function StatCards({ stats }: { stats: DashboardStats }) {
  const cards = [["Products", stats.totalProducts, Package, "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400", "/admin/products"], ["Orders", stats.totalOrders, ShoppingCart, "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400", "/admin/orders"], ["Revenue", currency(stats.totalRevenue), IndianRupee, "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400", "/admin/orders"], ["Pending", stats.pendingOrders, Clock, "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400", "/admin/orders"], ["AOV", currency(stats.avgOrderValue), TrendingUp, "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400", "/admin/orders"], ["Customers", stats.customers ?? stats.totalCustomers, ShoppingCart, "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400", "/admin/orders"]] as const;
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([label, value, Icon, color, href]) => <Link key={label} href={href} className="rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p></div><div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}><Icon className="h-5 w-5" /></div></div></Link>)}</div>;
}

export function RevenueTrendChart({ data, range, onRangeChange }: { data: DashboardStats["selectedTimeSeries"]; range: 7 | 30; onRangeChange: (range: 7 | 30) => void }) {
  const chartData = data.map((point) => ({ ...point, label: new Date(`${point.date}T12:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) }));
  const hasData = chartData.some((point) => point.revenue > 0 || point.orderCount > 0);
  return <Panel title="Revenue trend" action={<div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700" role="group" aria-label="Revenue range"><button type="button" onClick={() => onRangeChange(7)} aria-pressed={range === 7} className={`rounded-md px-2.5 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${range === 7 ? "bg-emerald-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>7d</button><button type="button" onClick={() => onRangeChange(30)} aria-pressed={range === 30} className={`rounded-md px-2.5 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${range === 30 ? "bg-emerald-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>30d</button></div>}>
    {!hasData ? <EmptyState text="No revenue data for this period" /> : <div className="h-64" aria-label={`Revenue chart for the last ${range} days`}><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ left: 4, right: 8, top: 8 }}><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#059669" stopOpacity={0.3} /><stop offset="100%" stopColor="#059669" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} /><YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} /><Tooltip formatter={(value, name) => [name === "revenue" ? currency(Number(value)) : value, name === "revenue" ? "Revenue" : "Orders"]} /><Area type="monotone" dataKey="revenue" stroke="#059669" fill="url(#revenueFill)" strokeWidth={2} /><Area type="monotone" dataKey="orderCount" stroke="#2563eb" fill="none" strokeWidth={2} /></AreaChart></ResponsiveContainer></div>}
  </Panel>;
}

export function BreakdownCharts({ stats }: { stats: DashboardStats }) {
  const hasStatuses = stats.orderStatusBreakdown.some((entry) => entry.count > 0);
  return <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Panel title="Order status">{!hasStatuses ? <EmptyState text="No orders yet" /> : <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.orderStatusBreakdown} layout="vertical" margin={{ left: 12, right: 12 }}><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="status" width={100} tickFormatter={statusLabel} tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => [value, "Orders"]} /><Bar dataKey="count" radius={[0, 4, 4, 0]}>{stats.orderStatusBreakdown.map((entry) => <Cell key={entry.status} fill={statusColors[entry.status] || "#64748b"} />)}</Bar></BarChart></ResponsiveContainer></div>}</Panel><Panel title="Payment methods">{stats.paymentMethodBreakdown.length === 0 ? <EmptyState text="No payment data yet" /> : <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.paymentMethodBreakdown} dataKey="count" nameKey="method" cx="50%" cy="50%" outerRadius={82} label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}>{stats.paymentMethodBreakdown.map((entry, index) => <Cell key={entry.method} fill={pieColors[index % pieColors.length]} />)}</Pie><Tooltip formatter={(value) => [value, "Orders"]} /></PieChart></ResponsiveContainer></div>}</Panel><Panel title="Top categories">{stats.topCategories.length === 0 ? <EmptyState text="No category sales yet" /> : <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.topCategories} margin={{ left: 8, right: 8 }}><XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => [value, "Units sold"]} /><Bar dataKey="units" fill="#059669" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>}</Panel><Panel title="Top products"><div className="space-y-3">{stats.topProducts.length === 0 ? <EmptyState text="No product sales yet" /> : stats.topProducts.map((product, index) => <div key={`${product.name}-${product.unit}`} className="flex items-center gap-3"><span className="w-5 text-sm font-semibold text-slate-400">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{product.name}</p><p className="text-xs text-slate-500">{product.unit || ""} · {product.units} units</p></div><span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{currency(product.revenue)}</span></div>)}</div></Panel></div>;
}

export function RecentOrders({ orders }: { orders: DashboardStats["recentOrders"] }) {
  return <Panel title="Recent orders" action={<Link href="/admin/orders" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">View all <ArrowRight className="h-3 w-3" /></Link>}>{orders.length === 0 ? <EmptyState text="No orders yet" /> : <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="text-xs text-slate-500"><tr><th className="pb-2 font-medium">Order</th><th className="pb-2 font-medium">Customer</th><th className="pb-2 font-medium">Amount</th><th className="pb-2 text-right font-medium">Status</th></tr></thead><tbody>{orders.map((order) => <tr key={order.orderId} className="border-t border-slate-100 dark:border-slate-800"><td className="py-3"><Link href={`/admin/orders/${order.orderId}`} className="font-medium text-emerald-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">{order.orderId}</Link><div className="text-xs text-slate-500">{order.items?.length || 0} items</div></td><td className="py-3 text-slate-700 dark:text-slate-300">{order.customer?.fullName || "Guest"}</td><td className="py-3 font-medium">{currency(order.totalAmount)}</td><td className="py-3 text-right"><span className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColors[order.status] || "#64748b" }} />{statusLabel(order.status)}</span></td></tr>)}</tbody></table></div>}</Panel>;
}

export function LowStock({ products }: { products: DashboardStats["lowStockProducts"] }) {
  return <Panel title="Low stock" action={<Link href="/admin/products" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">Manage <ArrowRight className="h-3 w-3" /></Link>}>{products.length === 0 ? <EmptyState text="All products are well stocked" /> : <div className="space-y-3">{products.map((product) => <div key={product.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50"><div className="flex min-w-0 items-center gap-3"><ProductImage image={product.image as string | CloudinaryImage | undefined} alt="" className="h-10 w-10 shrink-0 rounded-lg" sizes="40px" /><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{product.name}</p><p className="text-xs text-slate-500">{product.unit}</p></div></div><span className="shrink-0 rounded-full bg-rose-100 px-2 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-400">{product.stockQuantity ?? 0} left</span></div>)}</div>}</Panel>;
}

function EmptyState({ text }: { text: string }) { return <p className="py-8 text-center text-sm text-slate-400">{text}</p>; }
