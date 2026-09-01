import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/lib/models/Order";

const VALID_STATUSES = [
  "pending",
  "confirmed",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

const VALID_PAYMENT_STATUSES = ["pending", "paid", "failed"];
const VALID_SORT_FIELDS = ["createdAt", "totalAmount", "customer.fullName"];
const VALID_SORT_ORDERS = ["asc", "desc"];

export async function GET(request: Request) {
  const { error } = await requireOwner();
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    const query = buildQuery(params);
    const sort = buildSort(params);
    const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || "25", 10) || 25));

    if (params.export === "csv") {
      const allOrders = await Order.find(query).sort(sort).lean();
      const csv = buildCsv(allOrders);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    const [total, items] = await Promise.all([
      Order.countDocuments(query),
      Order.find(query).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    ]);

    const summary = await computeSummary(query);

    return NextResponse.json({
      success: true,
      data: { items, total, page, limit, summary },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

function buildQuery(params: Record<string, string>): Record<string, unknown> {
  const query: Record<string, unknown> = {};

  if (params.status && params.status !== "all" && VALID_STATUSES.includes(params.status)) {
    query.status = params.status;
  }

  if (params.paymentStatus && params.paymentStatus !== "all" && VALID_PAYMENT_STATUSES.includes(params.paymentStatus)) {
    query.paymentStatus = params.paymentStatus;
  }

  if (params.paymentMethod && params.paymentMethod !== "all") {
    query["customer.paymentMethod"] = params.paymentMethod;
  }

  if (params.dateFrom || params.dateTo) {
    query.createdAt = {};
    if (params.dateFrom) {
      const from = new Date(params.dateFrom);
      if (!isNaN(from.getTime())) {
        (query.createdAt as Record<string, unknown>).$gte = from;
      }
    }
    if (params.dateTo) {
      const to = new Date(params.dateTo);
      if (!isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        (query.createdAt as Record<string, unknown>).$lte = to;
      }
    }
    if (Object.keys(query.createdAt as Record<string, unknown>).length === 0) {
      delete query.createdAt;
    }
  }

  if (params.minAmount || params.maxAmount) {
    query.totalAmount = {};
    if (params.minAmount) {
      const min = Number(params.minAmount);
      if (!isNaN(min)) (query.totalAmount as Record<string, unknown>).$gte = min;
    }
    if (params.maxAmount) {
      const max = Number(params.maxAmount);
      if (!isNaN(max)) (query.totalAmount as Record<string, unknown>).$lte = max;
    }
    if (Object.keys(query.totalAmount as Record<string, unknown>).length === 0) {
      delete query.totalAmount;
    }
  }

  if (params.search && params.search.trim()) {
    const searchRegex = new RegExp(params.search.trim(), "i");
    query.$or = [
      { orderId: searchRegex },
      { "customer.fullName": searchRegex },
      { "customer.phoneNumber": searchRegex },
    ];
  }

  return query;
}

function buildSort(params: Record<string, string>): Record<string, 1 | -1> {
  const sortBy = params.sortBy && VALID_SORT_FIELDS.includes(params.sortBy) ? params.sortBy : "createdAt";
  const sortOrder = params.sortOrder && VALID_SORT_ORDERS.includes(params.sortOrder) ? params.sortOrder : "desc";
  return { [sortBy]: sortOrder === "asc" ? 1 : -1 };
}

async function computeSummary(query: Record<string, unknown>) {
  const [totalOrders, totalRevenue, pendingCount, confirmedCount, outForDeliveryCount, deliveredCount, cancelledCount, paidCount, avgOrderValue] =
    await Promise.all([
      Order.countDocuments(query),
      Order.aggregate([
        { $match: { ...query, status: { $in: ["delivered", "confirmed", "out_for_delivery"] } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Order.countDocuments({ ...query, status: "pending" }),
      Order.countDocuments({ ...query, status: "confirmed" }),
      Order.countDocuments({ ...query, status: "out_for_delivery" }),
      Order.countDocuments({ ...query, status: "delivered" }),
      Order.countDocuments({ ...query, status: "cancelled" }),
      Order.countDocuments({ ...query, paymentStatus: "paid" }),
      Order.aggregate([
        { $match: query },
        { $group: { _id: null, avg: { $avg: "$totalAmount" } } },
      ]),
    ]);

  return {
    totalOrders,
    totalRevenue: totalRevenue[0]?.total || 0,
    pendingCount,
    confirmedCount,
    outForDeliveryCount,
    deliveredCount,
    cancelledCount,
    paidCount,
    avgOrderValue: Math.round(avgOrderValue[0]?.avg || 0),
  };
}

function buildCsv(orders: Array<Record<string, unknown>>): string {
  const headers = [
    "Order ID", "Customer Name", "Phone", "Address", "Landmark",
    "Delivery Slot", "Payment Method", "Payment Status", "Status",
    "Total Amount", "Items Count", "Created At", "Estimated Delivery",
  ];

  const rows = orders.map((order: Record<string, unknown>) => {
    const customer = (order.customer as Record<string, unknown>) || {};
    const items = (order.items as Array<Record<string, unknown>>) || [];
    const totalItems = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    return [
      String(order.orderId || ""),
      String(customer.fullName || ""),
      String(customer.phoneNumber || ""),
      String(customer.address || ""),
      String(customer.landmark || ""),
      String(customer.deliverySlot || ""),
      String(customer.paymentMethod || ""),
      String(order.paymentStatus || ""),
      String(order.status || ""),
      String(order.totalAmount || 0),
      String(totalItems),
      order.createdAt ? new Date(order.createdAt as string).toISOString() : "",
      order.estimatedDelivery ? new Date(order.estimatedDelivery as string).toISOString() : "",
    ];
  });

  const escapeCsv = (value: string) => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  return [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n");
}