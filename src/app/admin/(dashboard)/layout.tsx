import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AdminShell } from "./AdminShell";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  if (session.user.role !== "owner") {
    redirect("/");
  }

  return (
    <AdminShell
      userName={session.user.name || "Owner"}
      userInitial={session.user.name?.[0]?.toUpperCase() || "U"}
    >
      {children}
    </AdminShell>
  );
}