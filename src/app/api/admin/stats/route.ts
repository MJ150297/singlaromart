import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Product } from "@/lib/models/Product";
import { Order } from "@/lib/models/Order";
import { Category } from "@/lib/models/Category";
import { Banner } from "@/lib/models/Banner";
import { User } from "@/lib/models/User";
import { getErrorMessage } from "@/lib/errors";
import { getISTDayRange } from "@/lib/date-time";

const EARNINGS_STATUSES = ["delivered", "confirmed", "out_for_delivery"];
const ORDER_STATUSES = ["pending", "confirmed", "out_for_delivery", "delivered", "cancelled"];

type DailyPoint = { date: string; revenue: number; orderCount: number };

function zeroFillSeries(dateKeys: string[], points: Array<Partial<DailyPoint> & { _id?: string }>): DailyPoint[] {
  const byDate = new Map(points.map((point) => [point._id, point]));
  return dateKeys.map((date) => ({
    date,
    revenue: Number(byDate.get(date)?.revenue) || 0,
    orderCount: Number(byDate.get(date)?.orderCount) || 0,
  }));
}

export async function GET(request: Request) {
  const { error } = await requireOwner();
  if (error) return error;

  try {
    await connectToDatabase();

    const requestedRange = new URL(request.url).searchParams.get("range");
    const range = requestedRange === "7" ? 7 : 30;
    const trendRange = getISTDayRange(30);
    const [counts, revenueResult, earnedOrderCountResult, paidRevenueResult, statusResult, recentOrders, lowStockProducts, trendResult, paymentResult, productResult, categoryResult] =
      await Promise.all([
        Promise.all([
          Product.countDocuments(),
          Order.countDocuments(),
          Category.countDocuments(),
          Banner.countDocuments(),
          User.countDocuments({ role: "customer" }),
        ]) as Promise<[number, number, number, number, number]>,
        Order.aggregate([
          { $match: { status: { $in: EARNINGS_STATUSES } } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
        Order.countDocuments({ status: { $in: EARNINGS_STATUSES } }),
        Order.aggregate([
          { $match: { paymentStatus: "paid", status: { $ne: "cancelled" } } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
        Order.aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Order.find({}, { _id: 0, orderId: 1, createdAt: 1, totalAmount: 1, status: 1, "customer.fullName": 1, items: 1 })
          .sort({ createdAt: -1 }).limit(5).lean(),
        Product.find({ stockQuantity: { $lt: 10 } }, { _id: 0, id: 1, name: 1, unit: 1, stockQuantity: 1, image: 1 })
          .sort({ stockQuantity: 1 }).limit(5).lean(),
        Order.aggregate([
          { $match: { createdAt: { $gte: trendRange.from, $lte: trendRange.to } } },
          { $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
            orderCount: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $in: ["$status", EARNINGS_STATUSES] }, "$totalAmount", 0] } },
          } },
          { $sort: { _id: 1 } },
        ]),
        Order.aggregate([
          { $match: { status: { $ne: "cancelled" } } },
          { $group: {
            _id: { $ifNull: ["$customer.paymentMethod", "unknown"] },
            count: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $in: ["$status", EARNINGS_STATUSES] }, "$totalAmount", 0] } },
          } },
          { $sort: { count: -1 } },
        ]),
        Order.aggregate([
          { $match: { status: { $ne: "cancelled" } } },
          { $unwind: "$items" },
          { $group: {
            _id: { productId: "$items.productId", unit: "$items.unit" },
            name: { $first: "$items.name" },
            unit: { $first: "$items.unit" },
            units: { $sum: "$items.quantity" },
            revenue: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } },
          } },
          { $sort: { units: -1 } },
          { $limit: 5 },
          { $project: { _id: 0, name: { $ifNull: ["$name", "Unknown"] }, unit: { $ifNull: ["$unit", ""] }, units: 1, revenue: { $round: ["$revenue", 0] } } },
        ]),
        Order.aggregate([
          { $match: { status: { $ne: "cancelled" } } },
          { $unwind: "$items" },
          { $lookup: { from: "products", localField: "items.productId", foreignField: "id", as: "product" } },
          { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
          { $lookup: { from: "categories", localField: "product.categoryId", foreignField: "id", as: "category" } },
          { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
          { $group: {
            _id: { $ifNull: ["$product.categoryId", "unknown"] },
            name: { $first: { $ifNull: ["$category.name", { $ifNull: ["$product.category", "Unknown"] }] } },
            units: { $sum: "$items.quantity" },
          } },
          { $sort: { units: -1 } },
          { $limit: 5 },
          { $project: { _id: 0, name: 1, units: 1 } },
        ]),
      ]);

    const [totalProducts, totalOrders, totalCategories, totalBanners, totalCustomers] = counts;
    const totalRevenue = Number(revenueResult[0]?.total) || 0;
    const paidRevenue = Number(paidRevenueResult[0]?.total) || 0;
    const statusMap = new Map(statusResult.map((row: { _id?: string; count?: number }) => [row._id, row.count || 0]));
    const orderStatusBreakdown = ORDER_STATUSES.map((status) => ({ status, count: statusMap.get(status) || 0 }));
    const pendingOrders = statusMap.get("pending") || 0;
    const deliveredOrders = statusMap.get("delivered") || 0;
    const cancelledOrders = statusMap.get("cancelled") || 0;
    const earnedOrderCount = Number(earnedOrderCountResult) || 0;
    const avgOrderValue = earnedOrderCount > 0 ? Math.round(totalRevenue / earnedOrderCount) : 0;
    const dateKeys = trendRange.dateKeys;
    const timeSeries = {
      "7": zeroFillSeries(dateKeys.slice(-7), trendResult),
      "30": zeroFillSeries(dateKeys, trendResult),
    };
    const selectedTimeSeries = timeSeries[String(range) as "7" | "30"];
    const paymentMethodBreakdown = paymentResult.map((row: { _id?: string; count?: number; revenue?: number }) => ({ method: row._id || "unknown", count: row.count || 0, revenue: Math.round(row.revenue || 0) }));
    const topProducts = productResult;
    const topCategories = categoryResult;

    return NextResponse.json({
      success: true,
      data: {
        totalProducts, totalOrders, totalCategories, totalBanners,
        pendingOrders, deliveredOrders, cancelledOrders, totalCustomers,
        totalRevenue, paidRevenue, avgOrderValue, customers: totalCustomers,
        recentOrders, lowStockProducts, timeSeries, selectedTimeSeries, range,
        orderStatusBreakdown, paymentMethodBreakdown, topCategories, topProducts,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
