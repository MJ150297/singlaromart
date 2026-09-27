import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongoose";
import { User } from "@/lib/models/User";
import { getErrorMessage } from "@/lib/errors";
import { getDefaultAddress, normalizeSavedAddresses } from "@/lib/addressProfiles";

function requireAuth() {
  return auth().then((session) => {
    if (!session?.user?.id) {
      return { session: null, error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
    }
    return { session, error: null };
  });
}

export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.session) {
    return authResult.error;
  }

  try {
    await connectToDatabase();
    const user = await User.findById(authResult.session.user.id)
      .select("name email displayEmail phone defaultAddress savedAddresses")
      .lean();

    if (!user) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
    }

    const savedAddresses = normalizeSavedAddresses((user as { savedAddresses?: unknown }).savedAddresses ?? []);
    const defaultAddress = user.defaultAddress ?? getDefaultAddress(savedAddresses);

    return NextResponse.json({
      success: true,
      data: {
        name: user.name,
        email: user.email ?? user.displayEmail ?? null,
        phone: user.phone ?? null,
        defaultAddress,
        savedAddresses,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || "Failed to load profile",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  const authResult = await requireAuth();
  if (!authResult.session) {
    return authResult.error;
  }

  const body = await req.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const defaultAddress =
    typeof body?.defaultAddress === "string"
      ? body.defaultAddress.trim()
      : typeof body?.address === "string"
        ? body.address.trim()
        : "";
  const savedAddressesInput = normalizeSavedAddresses(body?.savedAddresses ?? []);

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
        _id: { $ne: authResult.session.user.id },
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

    let resolvedSavedAddresses = savedAddressesInput;
    if (defaultAddress) {
      const existingMatch = resolvedSavedAddresses.find(
        (item) => item.fullAddress.toLowerCase() === defaultAddress.toLowerCase()
      );
      if (!existingMatch) {
        resolvedSavedAddresses = [
          { id: `saved-${Date.now()}`, label: "Saved", fullAddress: defaultAddress, isDefault: true },
          ...resolvedSavedAddresses,
        ];
      } else if (!resolvedSavedAddresses.some((item) => item.isDefault)) {
        resolvedSavedAddresses = resolvedSavedAddresses.map((item) => ({
          ...item,
          isDefault: item.id === existingMatch.id,
        }));
      }
    }

    if (resolvedSavedAddresses.length > 0 && !resolvedSavedAddresses.some((item) => item.isDefault)) {
      resolvedSavedAddresses = resolvedSavedAddresses.map((item, idx) => ({
        ...item,
        isDefault: idx === 0,
      }));
    }

    const resolvedDefaultAddress = getDefaultAddress(resolvedSavedAddresses) || defaultAddress || "";
    const update: Record<string, unknown> = {
      name,
      defaultAddress: resolvedDefaultAddress,
      savedAddresses: resolvedSavedAddresses,
    };

    if (email) {
      update.email = email;
      update.displayEmail = email;
    } else {
      update.$unset = { email: 1, displayEmail: 1 };
    }

    const updatedUser = await User.findByIdAndUpdate(
      authResult.session.user.id,
      update,
      {
        returnDocument: "after",
        runValidators: true,
      },
    )
      .select("name email displayEmail phone defaultAddress")
      .lean();

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 },
      );
    }

    const updatedSavedAddresses = normalizeSavedAddresses((updatedUser as { savedAddresses?: unknown }).savedAddresses ?? []);

    return NextResponse.json({
      success: true,
      data: {
        name: updatedUser.name,
        email: updatedUser.email ?? updatedUser.displayEmail ?? null,
        phone: updatedUser.phone ?? null,
        defaultAddress: updatedUser.defaultAddress ?? getDefaultAddress(updatedSavedAddresses),
        savedAddresses: updatedSavedAddresses,
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
