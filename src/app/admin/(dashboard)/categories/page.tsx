import CategoriesClient from "./CategoriesClient";

export default async function AdminCategoriesPage() {
  // Categories are fetched client-side via SWR, where the browser
  // automatically sends the session cookie. No server-side fetch needed here.
  return <CategoriesClient initialCategories={[]} />;
}
