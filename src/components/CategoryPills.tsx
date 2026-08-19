"use client";

import { CategoryIcon } from "@/lib/categoryIcons";

interface CategoryPillsProps {
  categories: { id: string; name: string; icon: string }[];
  selectedCategory: string;
  onSelect: (categoryId: string) => void;
}

export function CategoryPills({
  categories,
  selectedCategory,
  onSelect,
}: CategoryPillsProps) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm md:text-base text-slate-800 dark:text-slate-200">
          Explore Categories
        </h3>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
              selectedCategory === cat.id
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400"
            }`}
          >
            <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
            <span>{cat.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}