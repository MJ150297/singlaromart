import OffersClient from "./OffersClient";

export default async function AdminOffersPage() {
  // Offers are fetched client-side via SWR, where the browser
  // automatically sends the session cookie. No server-side fetch needed here.
  return <OffersClient initialOffers={[]} />;
}
