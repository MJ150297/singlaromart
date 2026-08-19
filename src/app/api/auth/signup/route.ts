import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db/mongoose";
import { User } from "@/lib/models/User";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// Rate limit: 5 signup attempts per hour per IP
const SIGNUP_LIMIT = 5;
const SIGNUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: Request) {
  try {
    // Rate limit by IP
    const ip = getClientIp(req);
    const rateLimited = await checkRateLimit({
      key: "signup",
      identifier: ip,
      limit: SIGNUP_LIMIT,
      windowMs: SIGNUP_WINDOW_MS,
    });
    if (rateLimited) {
      return NextResponse.json(
        { success: false, error: rateLimited },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, email, password, role, setupToken } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if email already exists
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Email already registered" },
        { status: 409 }
      );
    }

    // Determine role
    const ownerExists = await User.exists({ role: "owner" });

    let finalRole = "customer";
    if (role === "owner") {
      if (ownerExists) {
        return NextResponse.json(
          { success: false, error: "Store owner already registered" },
          { status: 403 }
        );
      }
      // Validate the one-time setup token for the first owner
      const expectedToken = process.env.ADMIN_SETUP_TOKEN;
      if (!expectedToken) {
        return NextResponse.json(
          {
            success: false,
            error: "Server is not configured for owner setup. Contact the administrator.",
          },
          { status: 500 }
        );
      }
      if (!setupToken || setupToken !== expectedToken) {
        return NextResponse.json(
          { success: false, error: "Invalid setup token" },
          { status: 403 }
        );
      }
      finalRole = "owner";
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: finalRole,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to create account" },
      { status: 500 }
    );
  }
}