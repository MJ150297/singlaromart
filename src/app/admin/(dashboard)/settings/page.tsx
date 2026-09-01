import { auth } from "@/auth";
import SettingsClient from "./SettingsClient";

export default async function AdminSettingsPage() {
  const session = await auth();

  return (
    <SettingsClient
      initialProfile={{
        name: session?.user?.name || "Owner",
        email: session?.user?.email || null,
        phone: session?.user?.phone || null,
        role: session?.user?.role || "owner",
      }}
    />
  );
}
