import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Product } from "@/lib/models/Product";
import { Order } from "@/lib/models/Order";
import { Category } from "@/lib/models/Category";
import { Banner } from "@/lib/models/Banner";
import { getErrorMessage } from "@/lib/errors";

export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;

  try {
    await connectToDatabase();

    const [totalProducts, totalOrders, totalCategories, totalBanners, pendingOrders, deliveredOrders] =
      await Promise.all([
        Product.countDocuments(),
        Order.countDocuments(),
        Category.countDocuments(),
        Banner.countDocuments(),
        Order.countDocuments({ status: "pending" }),
        Order.countDocuments({ status: "delivered" }),
      ]);

    // Calculate total revenue from delivered orders
    const revenueResult = await Order.aggregate([
      { $match: { status: { $in: ["delivered", "confirmed", "out_for_delivery"] } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Low stock products
    const lowStockProducts = await Product.find({ stockQuantity: { $lt: 10 } })
      .sort({ stockQuantity: 1 })
      .limit(5)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        totalProducts,
        totalOrders,
        totalCategories,
        totalBanners,
        pendingOrders,
        deliveredOrders,
        totalRevenue,
        recentOrders,
        lowStockProducts,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
