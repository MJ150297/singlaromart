import BannersClient from "./BannersClient";

export default async function AdminBannersPage() {
  // Banners are fetched client-side via SWR, where the browser
  // automatically sends the session cookie. No server-side fetch needed here.
  return <BannersClient initialBanners={[]} />;
}
