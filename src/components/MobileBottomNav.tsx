"use client";

import Link from "next/link";
import { Home, ShoppingBag, Package } from "lucide-react";
import { useSession } from "next-auth/react";
import { useAppSelector, useAppDispatch } from "@/store";
import { toggleCartDrawer } from "@/store/slices/cartSlice";

export function MobileBottomNav() {
  const { data: session } = useSession();
  const isAuthenticated = Boolean(session?.user);
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((state) => state.cart);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const navItems = [
    { id: "home", label: "Home", icon: Home, active: true, href: "/" },
    { id: "orders", label: "Orders", icon: Package, active: false, href: "/orders", condition: isAuthenticated },
    {
      id: "cart",
      label: "Cart",
      icon: ShoppingBag,
      active: false,
      badge: totalCount,
      onClick: () => dispatch(toggleCartDrawer(true)),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around py-1.5">
        {navItems.map((item) => {
          // Skip items with condition: false (i.e., not authenticated)
          if (item.condition === false) return null;

          const content = (
            <>
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-emerald-600 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </>
          );

          const className = `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors relative ${
            item.active
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`;

          if (item.href) {
            return (
              <Link key={item.id} href={item.href} className={className}>
                {content}
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={className}
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
}