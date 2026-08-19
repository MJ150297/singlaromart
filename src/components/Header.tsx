"use client";

import Link from "next/link";
import { ShoppingBag, Package } from "lucide-react";
import { useSession } from "next-auth/react";
import { useAppSelector, useAppDispatch } from "@/store";
import { toggleCartDrawer } from "@/store/slices/cartSlice";
import { ThemeToggle } from "./ThemeToggle";
import { SearchBar } from "./SearchBar";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function Header({ searchQuery, onSearchChange }: HeaderProps) {
  const { data: session } = useSession();
  const isAuthenticated = Boolean(session?.user);

  const dispatch = useAppDispatch();
  const { items } = useAppSelector((state) => state.cart);
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black text-xl flex items-center justify-center">
            I
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-base leading-tight tracking-tight text-emerald-700 dark:text-emerald-400">
              Indiyano
            </h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">
              Food & Baverages
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <SearchBar searchQuery={searchQuery} onSearchChange={onSearchChange} />

        {/* Right side: Orders, Theme toggle & Cart */}
        <div className="flex items-center gap-1 shrink-0">
          {isAuthenticated && (
            <Link
              href="/orders"
              className="hidden md:flex items-center gap-1.5 p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
              title="My Orders"
            >
              <Package className="w-5 h-5" />
              <span className="text-xs font-medium">Orders</span>
            </Link>
          )}

          <ThemeToggle />

          <button
            onClick={() => dispatch(toggleCartDrawer(true))}
            className="hidden md:flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full font-semibold text-xs transition-colors shadow-md"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{itemCount} Items</span>
            <span className="bg-emerald-800 px-2 py-0.5 rounded-full text-[11px]">
              ₹{totalAmount}
            </span>
          </button>

          {/* Mobile cart icon */}
          <button
            onClick={() => dispatch(toggleCartDrawer(true))}
            className="relative md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-emerald-600 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}