"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tags,
  Image as ImageIcon,
  Megaphone,
  Truck,
  TicketPercent,
  Gift,
  RotateCcw,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldAlert,
  BarChart3,
  Wallet,
} from "lucide-react";

import { site } from "@/lib/site";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/banners", label: "Banners", icon: ImageIcon },
  { href: "/admin/offers", label: "Offers", icon: Megaphone },
  { href: "/admin/delivery-fees", label: "Delivery Fees", icon: Truck },
  { href: "/admin/coupons", label: "Coupons", icon: TicketPercent },
  { href: "/admin/referral-programs", label: "Referrals", icon: Gift },
  { href: "/admin/refunds", label: "Refunds", icon: RotateCcw },
  { href: "/admin/credits", label: "Credits", icon: Wallet },
  { href: "/admin/promotion-reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/audit-events", label: "Audit", icon: ShieldAlert },
];

export function AdminShell({
  userName,
  userInitial,
  children,
}: {
  userName: string;
  userInitial: string;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  // Sync sidebar state with the md breakpoint (768px)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
      setSidebarOpen(e.matches);
    };
    setIsDesktop(mq.matches);
    setSidebarOpen(mq.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  // Close drawer on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSidebarOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Auto-close mobile drawer on route change
  useEffect(() => {
    if (!isDesktop) setSidebarOpen(false);
  }, [pathname, isDesktop]);

  async function handleLogout() {
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 overflow-x-hidden">
      {/* Top bar */}
      <header className="fixed inset-x-0 top-0 z-50 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center">
              {site.logoInitial}
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
              {site.name} Admin
            </span>
          </Link>
        </div>
      </header>

      {/* Reserve the fixed header's space in the document flow. */}
      <div className="h-14" aria-hidden="true" />

      <div className="flex">
        {/* Sidebar */}
        <aside
          inert={!sidebarOpen}
          aria-hidden={!sidebarOpen}
          className={`fixed top-14 bottom-0 left-0 z-30 w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-400"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User info + Logout (pinned at bottom) */}
          <div className="shrink-0 p-4 border-t border-slate-200 dark:border-slate-800">
            <Link
              href="/admin/settings"
              aria-label="Open account settings"
              className="mb-3 flex items-center gap-3 rounded-lg p-1 -m-1 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-slate-800"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-sm shrink-0">
                {userInitial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {userName}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                  Owner
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </aside>

        {/* Mobile backdrop */}
        {sidebarOpen && !isDesktop && (
          <div
            className="fixed inset-0 top-14 z-20 bg-slate-900/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Main content */}
        <div
          className={`flex-1 min-w-0 flex flex-col transition-[margin] duration-200 ease-in-out ${
            sidebarOpen && isDesktop ? "md:ml-60" : "md:ml-0"
          }`}
        >
          {/* Mobile nav */}
          <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-2 py-2 flex gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors whitespace-nowrap"
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            ))}
          </div>

          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
