"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";
import ProductImage from "./ProductImage";
import { useRouter } from "next/navigation";
import { Product } from "@/lib/schemas";
import { getProducts } from "@/lib/catalog";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function SearchBar({ searchQuery, onSearchChange }: SearchBarProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getProducts().then(setProducts).catch(console.error);
  }, []);

  // Debounced autocomplete using a timeout to avoid setState in effect
  const suggestionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any pending timeout
    if (suggestionTimeoutRef.current !== null) {
      clearTimeout(suggestionTimeoutRef.current);
      suggestionTimeoutRef.current = null;
    }

    // Only process if searchQuery has enough characters for autocomplete
    // If searchQuery is too short, just return without calling setSuggestions
    // The suggestions state will remain unchanged (keep previous results or empty)
    if (searchQuery.trim().length < 2) {
      // Don't call setSuggestions here - just return early
      // The suggestions will be managed by the input's onChange handler
      return;
    }

    // Set a timeout to debounce the autocomplete
    suggestionTimeoutRef.current = setTimeout(() => {
      const q = searchQuery.toLowerCase();
      const filtered = products.filter((p) => {
        const cat = p.category || "";
        return p.name.toLowerCase().includes(q) || cat.toLowerCase().includes(q);
      });
      setSuggestions(filtered.slice(0, 6));
    }, 300);

    // Cleanup on effect re-run or component unmount
    return () => {
      if (suggestionTimeoutRef.current !== null) {
        clearTimeout(suggestionTimeoutRef.current);
        suggestionTimeoutRef.current = null;
      }
    };
  }, [searchQuery, products]);

  const navigateToSearch = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      setShowSuggestions(false);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    },
    [router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        if (showSuggestions && focusedIndex >= 0 && suggestions.length > 0) {
          e.preventDefault();
          navigateToSearch(suggestions[focusedIndex].name);
          return;
        }
        e.preventDefault();
        navigateToSearch(searchQuery);
        return;
      }
      if (!showSuggestions || suggestions.length === 0) return;
      if (e.key === "ArrowDown") {
        setFocusedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    },
    [showSuggestions, suggestions, focusedIndex, navigateToSearch, searchQuery]
  );

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionRef.current &&
        !suggestionRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex-1 max-w-xl relative">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search for juices, beverages, basmati rice..."
        value={searchQuery}
        onChange={(e) => {
          onSearchChange(e.target.value);
          setShowSuggestions(true);
          setFocusedIndex(-1);
        }}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        className="w-full pl-10 pr-9 py-2 text-xs md:text-sm bg-slate-100 dark:bg-slate-800 border-none rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />

      {/* Clear button */}
      {searchQuery && (
        <button
          onClick={() => {
            onSearchChange("");
            setSuggestions([]);
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Autocomplete dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionRef}
          className="absolute top-full left-0 right-0 mt-1.5 z-30 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        >
          {suggestions.map((product, idx) => (
            <button
              key={product.id}
              onMouseDown={(e) => {
                e.preventDefault();
                navigateToSearch(product.name);
              }}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-xs transition-colors ${
                idx === focusedIndex
                  ? "bg-emerald-50 dark:bg-emerald-950/40"
                  : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
              }`}
            >
              <ProductImage image={product.image} alt={product.name} className="w-8 h-8 rounded-md shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                  {product.name}
                </p>
                <p className="text-[10px] text-slate-400">{product.category || ""} · {product.unit}</p>
              </div>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                ₹{product.price}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}