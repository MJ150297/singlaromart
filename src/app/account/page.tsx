"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  HelpCircle,
  IndianRupee,
  LogOut,
  Package,
  Pencil,
  Settings,
  ShoppingBag,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { DeliveryBar } from "@/components/DeliveryBar";
import { Header } from "@/components/Header";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { CartFloatingBar } from "@/components/CartFloatingBar";
import { CartDrawer } from "@/components/CartDrawer";
import { CheckoutModal } from "@/components/CheckoutModal";
import { OrderCard, Order } from "@/components/OrderCard";
import { SkeletonOrderCard, SkeletonStats } from "@/components/Skeletons";
import { NotificationSettings } from "@/components/NotificationSettings";
import { generateWhatsAppHelpUrl } from "@/lib/whatsapp";
import { ReferralCreditsPanel } from "@/components/ReferralCreditsPanel";

type ApiResponse<T> = { success: boolean; data?: T; error?: string };
const fetcher = async (url: string) => { const response = await fetch(url); const body = await response.json() as ApiResponse<Order[]>; if (!response.ok || !body.success) throw new Error(body.error || "Unable to load orders"); return body.data ?? []; };
function maskPhone(phone?: string) { if (!phone) return "Phone number not available"; const digits = phone.replace(/\D/g, ""); return `+91 ${digits.slice(-10, -5)} ••• ${digits.slice(-2)}`; }

const navItems: Array<{ href: string; match: string | null; label: string; Icon: LucideIcon }> = [
  { href: "/account", match: "/account", label: "Profile", Icon: UserRound },
  { href: "/orders", match: "/orders", label: "My Orders", Icon: Package },
  { href: "/account#settings", match: null, label: "Settings", Icon: Settings },
];

const quickLinks: Array<{ label: string; description: string; href: string; external?: boolean; Icon: LucideIcon; accent: string }> = [
  { label: "Browse products", description: "Fresh groceries and beverages", href: "/", Icon: ShoppingBag, accent: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" },
  { label: "My Orders", description: "Track and review your orders", href: "/orders", Icon: Package, accent: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400" },
  { label: "Track Order", description: "Live delivery status", href: "/orders", Icon: Truck, accent: "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400" },
  { label: "Help & Support", description: "Chat with us on WhatsApp", href: generateWhatsAppHelpUrl(), external: true, Icon: HelpCircle, accent: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400" },
];

export default function AccountPage() { return <RequireAuth><AccountContent /></RequireAuth>; }

function AccountContent() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, update } = useSession();
  const { data: orders, isLoading, error, mutate } = useSWR<Order[]>("/api/orders/my", fetcher, {
    refreshInterval: (data) =>
      data && data.some((order) => ["pending", "confirmed", "out_for_delivery"].includes(order.status))
        ? 30_000
        : 0,
  });
  const [editing, setEditing] = useState(false); const [saving, setSaving] = useState(false); const [formError, setFormError] = useState("");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [defaultAddress, setDefaultAddress] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const list = orders ?? []; const pending = list.filter((o) => ["pending", "confirmed", "out_for_delivery"].includes(o.status)).length; const delivered = list.filter((o) => o.status === "delivered").length; const spent = list.reduce((sum, o) => sum + o.totalAmount, 0);
  const stats = [
    { label: "Total Orders", value: list.length, Icon: Package, accent: "text-emerald-200" },
    { label: "Pending", value: pending, Icon: Clock, accent: "text-amber-200" },
    { label: "Delivered", value: delivered, Icon: CheckCircle2, accent: "text-teal-200" },
    { label: "Total Spent", value: `₹${spent.toLocaleString("en-IN")}`, Icon: IndianRupee, accent: "text-white" },
  ];
  async function saveProfile(event: React.FormEvent) { event.preventDefault(); setSaving(true); setFormError(""); try { const response = await fetch("/api/account/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, defaultAddress }) }); const body = await response.json() as ApiResponse<{ name: string; email?: string | null; defaultAddress?: string | null }>; if (!response.ok || !body.success || !body.data) throw new Error(body.error || "Unable to update profile"); const updatedEmail = body.data.email ?? null; await update({ name: body.data.name, email: updatedEmail, displayEmail: updatedEmail }); setName(body.data.name); setEmail(updatedEmail || ""); setDefaultAddress(body.data.defaultAddress || ""); setEditing(false); } catch (err) { setFormError(err instanceof Error ? err.message : "Unable to update profile"); } finally { setSaving(false); } }
  async function logout() { await signOut({ redirect: false }); router.push("/"); router.refresh(); }
return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 md:pb-12 text-slate-900 dark:text-slate-100">
      <DeliveryBar />
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Hero banner */}
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 overflow-hidden shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Welcome back, {session?.user?.name || "Customer"}
              </h1>
              <p className="mt-1 text-sm text-emerald-100/90">
                Manage your profile, track orders, and get support
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-emerald-100">
                <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{maskPhone(session?.user?.phone)}</span>
                {session?.user?.displayEmail && <span className="text-emerald-100/70">· {session.user.displayEmail}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setName(session?.user?.name || ""); setEmail(session?.user?.displayEmail || session?.user?.email || ""); setDefaultAddress(""); void fetch("/api/account/profile").then(async (response) => { const body = await response.json() as ApiResponse<{ defaultAddress?: string | null }>; if (response.ok && body.success) setDefaultAddress(body.data?.defaultAddress || ""); }).catch(() => undefined); setEditing(true); }}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                <Pencil className="h-4 w-4" /> Edit profile
              </button>
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
          {/* Sidebar */}
          <nav className="flex gap-2 overflow-x-auto lg:block lg:space-y-2 lg:px-4">
            {navItems.map(({ href, match, label, Icon }) => {
              const active = match && (pathname === match || pathname?.startsWith(`${match}/`));
              return (
                <Link
                  key={label}
                  href={href}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${active ? "bg-emerald-600 text-white" : "border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-white" : "text-emerald-600"}`} />{label}
                </Link>
              );
            })}
          </nav>

          {/* Main */}
          <main className="space-y-6">
            {/* Stats */}
            {isLoading ? <SkeletonStats /> : (
              <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {stats.map(({ label, value, Icon, accent }) => (
                  <Link
                    key={label}
                    href={label === "Total Spent" ? "/account" : "/orders"}
                    className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      accent === "text-amber-200" ? "bg-amber-50 dark:bg-amber-950" :
                      accent === "text-teal-200" ? "bg-teal-50 dark:bg-teal-950" :
                      "bg-emerald-50 dark:bg-emerald-950"
                    }`}>
                      <Icon className={`h-4 w-4 ${
                        accent === "text-amber-200" ? "text-amber-600 dark:text-amber-400" :
                        accent === "text-teal-200" ? "text-teal-600 dark:text-teal-400" :
                        "text-emerald-600 dark:text-emerald-400"
                      }`} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{label}</p>
                    <p className="mt-0.5 text-xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
                  </Link>
                ))}
              </section>
            )}

            {/* Quick links */}
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {quickLinks.map(({ label, description, href, external, Icon, accent }) => {
                const content = (
                  <>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</p>
                      <p className="text-[11px] text-slate-500 truncate">{description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
                  </>
                );
                const cls = "flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:hover:border-emerald-700 transition-all";
                return external ? (
                  <a key={label} href={href} target="_blank" rel="noreferrer" className={cls}>{content}</a>
                ) : (
                  <Link key={label} href={href} className={cls}>{content}</Link>
                );
              })}
            </section>

            {/* Notifications / settings */}
            <NotificationSettings />

            <ReferralCreditsPanel />

            {/* Recent orders */}
            <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent orders</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Your latest order activity</p>
                </div>
                <Link href="/orders" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 transition-colors">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="px-5 pb-5">
                {isLoading ? <div className="space-y-3"><SkeletonOrderCard /><SkeletonOrderCard /></div> : error ? (
                  <div className="py-8 text-center text-sm text-rose-500">{error.message}<button onClick={() => mutate()} className="ml-2 text-emerald-600">Retry</button></div>
                ) : list.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-500">No orders yet. <Link href="/" className="text-emerald-600 font-semibold">Start shopping</Link></div>
                ) : (
                  <div className="space-y-3">{list.slice(0, 3).map((order) => <OrderCard key={order.orderId} order={order} />)}</div>
                )}
              </div>
            </section>
          </main>
        </div>
      </div>

      <MobileBottomNav />
      <CartFloatingBar onCheckout={() => setIsCheckoutOpen(true)} />
      <CartDrawer />
      {isCheckoutOpen && (
        <CheckoutModal onClose={() => setIsCheckoutOpen(false)} />
      )}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <form onSubmit={saveProfile} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit profile</h2>
              <button type="button" onClick={() => setEditing(false)} className="rounded-lg p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <label className="mb-3 block text-sm font-medium">Name<input required minLength={3} value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" /></label>
            <label className="mb-3 block text-sm font-medium">Email <span className="font-normal text-slate-400">(optional)</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" /></label>
            <label className="mb-4 block text-sm font-medium">Default delivery address <span className="font-normal text-slate-400">(optional)</span><textarea value={defaultAddress} onChange={(e) => setDefaultAddress(e.target.value)} rows={3} placeholder="House/flat no., street, area, landmark" className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" /></label>
            {formError && <p className="mb-3 text-sm text-rose-500">{formError}</p>}
            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button>
              <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-500">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
