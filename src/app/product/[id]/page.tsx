import { getProduct } from "@/lib/catalog";
import { Product } from "@/lib/schemas";
import ProductClient from "./ProductClient";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let initialProduct: Product | null = null;
  try {
    const product = await getProduct(id);
    initialProduct = product ?? null;
  } catch (err) {
    console.error(`Failed to fetch product ${id}:`, err);
  }

  return <ProductClient productId={id} initialProduct={initialProduct} />;
}