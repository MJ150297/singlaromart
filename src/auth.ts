import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db/mongoose";
import { User, UserDocument } from "@/lib/models/User";
import { checkRateLimit, clearRateLimit, getClientIp } from "@/lib/rateLimit";
import {
  normalizeIndianMobile,
  verifyOtp,
} from "@/lib/otp";
import type { NextAuthConfig } from "next-auth";
import type { JWT } from "@auth/core/jwt";

// Rate limit: 5 login attempts per 15 minutes per IP
const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Session durations
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days (remember me)

// Extend the built-in types
declare module "next-auth" {
  interface User {
    role?: string;
    tokenVersion?: number;
    rememberMe?: boolean;
    phone?: string;
    displayEmail?: string;
  }
      interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      rememberMe?: boolean;
      phone?: string;
      displayEmail?: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    tokenVersion?: number;
    rememberMe?: boolean;
    phone?: string;
    displayEmail?: string;
  }
}

async function checkLoginRateLimit(req: Request | undefined) {
  if (!req) return null;
  const ip = getClientIp(req);
  return checkRateLimit({
    key: "login",
    identifier: ip,
    limit: LOGIN_LIMIT,
    windowMs: LOGIN_WINDOW_MS,
  });
}

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mobile: { label: "Mobile", type: "text" },
        otp: { label: "OTP", type: "text" },
        rememberMe: { label: "Remember Me", type: "checkbox" },
      },
      async authorize(credentials, request) {
        try {
          // ─── Phone + OTP (customer flow) ────────────────────────────────
          if (credentials?.mobile || credentials?.otp) {
            const rawMobile = String(credentials.mobile ?? "");
            const otp = String(credentials.otp ?? "");
            const mobile = normalizeIndianMobile(rawMobile);

            if (!mobile) {
              throw new Error("InvalidMobile");
            }

            const rateLimited = await checkLoginRateLimit(
              request as unknown as Request
            );
            if (rateLimited) {
              console.warn(`[auth] Rate limited OTP login for ${mobile}`);
              throw new Error("RateLimited");
            }

            const verify = await verifyOtp(mobile, otp);
            if (!verify.ok) {
              const code =
                verify.message.startsWith("Too many")
                  ? "TooManyOtpAttempts"
                  : "InvalidOtp";
              throw new Error(code);
            }

            await connectToDatabase();

            // Atomic find-or-create by phone (upsert) so concurrent first-time
            // logins for the same number never create duplicate accounts.
            const user = await User.findOneAndUpdate(
              { phone: mobile },
              {
                $setOnInsert: {
                  name: "Customer " + mobile.slice(-4),
                  phone: mobile,
                  phoneVerified: true,
                  role: "customer",
                  tokenVersion: 0,
                },
              },
              {
                upsert: true,
                returnDocument: "after",
                lean: true,
              }
            );

            if (!user) {
              console.warn(`[auth] Unexpected: no user after upsert for ${mobile}`);
              throw new Error("ServerError");
            }

            if (!(user as UserDocument).phoneVerified) {
              await User.updateOne(
                { phone: mobile },
                { $set: { phoneVerified: true } }
              );
            }

            return {
              id: String((user as { _id: unknown })._id),
              name: (user as UserDocument).name as string,
              role: (user as UserDocument).role as string,
              tokenVersion: (user as UserDocument).tokenVersion ?? 0,
              rememberMe: true,
              phone: (user as UserDocument).phone as string,
              displayEmail: (user as UserDocument).displayEmail as string,
            };
          }

          // ── Email + password (admin/owner flow) ─────────────────────────
          if (!credentials?.email || !credentials?.password) {
            console.warn("[auth] Missing email or password");
            throw new Error("MissingCredentials");
          }

          const email = (credentials.email as string).toLowerCase();
          const rememberMe =
            credentials.rememberMe === "true" ||
            credentials.rememberMe === true;

          if (request) {
            const ip = getClientIp(request as unknown as Request);
            const rateLimited = await checkRateLimit({
              key: "login",
              identifier: ip,
              limit: LOGIN_LIMIT,
              windowMs: LOGIN_WINDOW_MS,
            });
            if (rateLimited) {
              console.warn(`[auth] Rate limited for IP ${ip}: ${rateLimited}`);
              throw new Error("RateLimited");
            }
          }

          await connectToDatabase();

          const user = await User.findOne({ email }).lean();

          if (!user) {
            console.warn(`[auth] No user found for email: ${email}`);
            throw new Error("InvalidCredentials");
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            (user as UserDocument).password as string
          );

          if (!isValid) {
            console.warn(`[auth] Password mismatch for email: ${email}`);
            throw new Error("InvalidCredentials");
          }

          if (request) {
            const ip = getIp(request as unknown as Request);
            await clearRateLimit({
              key: "login",
              identifier: ip,
            });
          }

          return {
            id: String((user as { _id: unknown })._id),
            name: (user as UserDocument).name as string,
            email: (user as UserDocument).email as string,
            role: (user as UserDocument).role as string,
            tokenVersion: (user as UserDocument).tokenVersion ?? 0,
            rememberMe,
            phone: (user as UserDocument).phone as string,
            displayEmail: (user as UserDocument).displayEmail as string,
          };
        } catch (error) {
          if (
            error instanceof Error &&
            [
              "MissingCredentials",
              "InvalidCredentials",
              "RateLimited",
              "InvalidMobile",
              "InvalidOtp",
              "TooManyOtpAttempts",
            ].includes(error.message)
          ) {
            throw error;
          }
          console.error("[auth] Exception during authorize:", error);
          throw new Error("ServerError");
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
  },
  cookies: {
    sessionToken: {
      name: "indiyano.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      },
    },
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "customer";
        token.tokenVersion = user.tokenVersion ?? 0;
        token.rememberMe = user.rememberMe ?? true;
        token.phone = user.phone;
        token.displayEmail = user.displayEmail;

        // If "remember me" is not checked, expire the session in 24 hours
        if (!token.rememberMe) {
          token.exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
        }
      }

      if (trigger === "update" && session) {
        // `useSession().update(data)` sends data at the top level. Accept the
        // nested shape too for compatibility with callers that send user data.
        const profile = session.user ?? session;
        if ("name" in profile && profile.name !== undefined) token.name = profile.name;
        if ("email" in profile) token.email = profile.email ?? undefined;
        if ("displayEmail" in profile) token.displayEmail = profile.displayEmail ?? undefined;
      }

      // Session revocation: check if the user's tokenVersion has changed
      if (token.id && token.tokenVersion !== undefined) {
        try {
          await connectToDatabase();
          const dbUser = await User.findById(token.id).select("tokenVersion").lean();
          const dbTokenVersion = (dbUser as UserDocument | null)?.tokenVersion ?? 0;
          if (dbTokenVersion !== token.tokenVersion) {
            return {};
          }
        } catch (error) {
          console.error("[auth] Error checking tokenVersion:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.role = token.role ?? "customer";
        session.user.rememberMe = token.rememberMe ?? true;
        session.user.phone = token.phone;
        session.user.displayEmail = token.displayEmail;
      }
      return session;
    },
  },
};

function getIp(req: Request): string {
  return getClientIp(req);
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
