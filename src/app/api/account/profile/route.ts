import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongoose";
import { User } from "@/lib/models/User";
import { getErrorMessage } from "@/lib/errors";

export async function PATCH(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const body = await req.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (name.length < 3) {
    return NextResponse.json(
      { success: false, error: "Name must be at least 3 characters" },
      { status: 400 },
    );
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { success: false, error: "Please enter a valid email address" },
      { status: 400 },
    );
  }

  try {
    await connectToDatabase();

    if (email) {
      const existing = await User.findOne({
        email,
        _id: { $ne: session.user.id },
      })
        .select("_id")
        .lean();

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: "Email already registered to another account",
          },
          { status: 409 },
        );
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      email
        ? { $set: { name, email, displayEmail: email } }
        : { $set: { name }, $unset: { email: 1, displayEmail: 1 } },
      {
        returnDocument: "after",
        runValidators: true,
      },
    )
      .select("name email displayEmail phone")
      .lean();

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        name: updatedUser.name,
        email: updatedUser.email ?? null,
        phone: updatedUser.phone ?? null,
      },
    });
  } catch (error: unknown) {
    console.error("Update account profile error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || "Failed to update profile",
      },
      { status: 500 },
    );
  }
}
