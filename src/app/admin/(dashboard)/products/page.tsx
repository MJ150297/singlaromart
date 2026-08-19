import ProductsClient from "./ProductsClient";

export default async function AdminProductsPage() {
  // Categories and products are fetched client-side via SWR, where the browser
  // automatically sends the session cookie. No server-side fetch needed here.
  return <ProductsClient initialCategories={[]} initialProducts={{ items: [] }} />;
}
