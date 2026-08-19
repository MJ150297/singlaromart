export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const statusColors: Record<string, string> = {
  pending: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
  confirmed: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400",
  out_for_delivery:
    "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400",
  delivered: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400",
};

export function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

export function getStatusColor(status: string) {
  return statusColors[status] || "bg-slate-100 text-slate-600";
}