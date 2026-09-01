"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  User,
  Package,
  Settings,
  LogOut,
  ChevronDown,
  UserCircle2,
} from "lucide-react";

export function ProfileMenu() {
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAuthenticated = Boolean(session?.user);
  const user = session?.user;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  async function handleLogout() {
    setOpen(false);
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  }

  const initial =
    user?.name?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "U";

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar / Profile button */}
      {isAuthenticated ? (
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1.5 p-1.5 rounded-full transition-colors ${
            open
              ? "bg-slate-100 dark:bg-slate-800"
              : "hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
          title={user?.name || "My Account"}
          aria-label="My account"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center select-none">
            {initial}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      ) : (
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center justify-center w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-700 transition-colors ${
            open
              ? "bg-slate-100 dark:bg-slate-800"
              : "hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
          title="Sign in or create account"
          aria-label="Sign in or create account"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <User className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50"
        >
          {isAuthenticated ? (
            <>
              {/* User info header */}
              <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-base flex items-center justify-center select-none shrink-0">
                    {initial}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {user?.name || "Customer"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-2">
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <UserCircle2 className="w-4 h-4 text-slate-400" />
                  My Profile
                </Link>
                <Link
                  href="/orders"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Package className="w-4 h-4 text-slate-400" />
                  My Orders
                </Link>
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  Settings
                </Link>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 py-2">
                <button
                  onClick={handleLogout}
                  role="menuitem"
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Logged-out dropdown */}
              <div className="px-5 py-6 text-center border-b border-slate-100 dark:border-slate-800">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto mb-3">
                  <User className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
                </div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Welcome to Indiyano
                </p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Sign in for faster checkout and track your orders
                </p>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <p className="text-xs text-slate-500 mt-3">
                  New to Indiyano?{" "}
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="text-emerald-600 hover:text-emerald-700 font-semibold"
                  >
                    Sign up with OTP
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}