import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Offer } from "@/lib/models/Offer";
import { Product, ProductDocument } from "@/lib/models/Product";
import { getErrorMessage } from "@/lib/errors";
import { matchesOfferTag } from "@/lib/offerMatching";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();

    const offer = await Offer.findOne({ id }).lean();
    if (!offer) {
      return NextResponse.json(
        { success: false, error: "Offer not found" },
        { status: 404 }
      );
    }

    let products: ProductDocument[] = [];

    if (offer.type === "tag" && offer.tag) {
      const productsCursor = await Product.find({ isPublished: true }).lean();
      products = productsCursor.filter((product) =>
        matchesOfferTag(String(offer.tag), product.tags)
      );
      products.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
    } else if (offer.type === "manual" && Array.isArray(offer.productIds)) {
      const ids: string[] = (offer.productIds as string[]).filter(Boolean);
      products = await Product.find({
        isPublished: true,
        id: { $in: ids },
      }).lean();

      // Preserve the manual order defined in productIds
      const orderMap = new Map(ids.map((pid, index) => [pid, index]));
      products.sort(
        (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
      );
    } else if (offer.type === "category" && offer.categoryId) {
      products = await Product.find({
        isPublished: true,
        categoryId: offer.categoryId,
      })
        .sort({ createdAt: -1 })
        .lean();
    }

    return NextResponse.json({ success: true, data: products });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}
