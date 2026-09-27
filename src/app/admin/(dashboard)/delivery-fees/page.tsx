import DeliveryFeesClient from "./DeliveryFeesClient";

export default async function AdminDeliveryFeesPage() {
  // Rules are fetched client-side via SWR, where the browser automatically
  // sends the session cookie. No server-side fetch needed here.
  return <DeliveryFeesClient />;
}