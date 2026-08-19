import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Guard for admin API routes.
 * Returns the session if the user is an owner, otherwise returns a 401/403 response.
 */
export async function requireOwner() {
  const session = await auth();

  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  if (session.user.role !== "owner") {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return { session, error: null };
}