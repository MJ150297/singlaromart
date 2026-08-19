import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db/mongoose";
import { User, UserDocument } from "@/lib/models/User";
import { checkRateLimit, clearRateLimit, getClientIp } from "@/lib/rateLimit";
import type { NextAuthConfig } from "next-auth";
import type { JWT } from "@auth/core/jwt";

// Rate limit: 5 login attempts per 15 minutes per IP
const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Session durations
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days (remember me)
// Note: No updateAge is set so that the manual `token.exp` override for
// "don't remember me" sessions (24h) is not overwritten by a token refresh.
// The jwt callback still runs on every request for tokenVersion checks.

// Extend the built-in types
declare module "next-auth" {
  interface User {
    role?: string;
    tokenVersion?: number;
    rememberMe?: boolean;
  }
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      rememberMe?: boolean;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    tokenVersion?: number;
    rememberMe?: boolean;
  }
}

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember Me", type: "checkbox" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          console.warn("[auth] Missing email or password");
          throw new Error("MissingCredentials");
        }

        const email = (credentials.email as string).toLowerCase();
        const rememberMe = credentials.rememberMe === "true" || credentials.rememberMe === true;

        try {
          // Rate limit login attempts by IP
          const ip = getClientIp(request as unknown as Request);
          console.log(`[auth] Login attempt for ${email} from IP ${ip}`);

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

          await connectToDatabase();

          const user = await User.findOne({ email }).lean();

          if (!user) {
            console.warn(`[auth] No user found for email: ${email}`);
            throw new Error("InvalidCredentials");
          }

          console.log(`[auth] User found: ${user.email}, role: ${user.role}`);

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password as string
          );

          if (!isValid) {
            console.warn(`[auth] Password mismatch for email: ${email}`);
            throw new Error("InvalidCredentials");
          }

          console.log(`[auth] Password valid for email: ${email}`);

          // On successful login, clear any rate limit entries for this IP
          await clearRateLimit({
            key: "login",
            identifier: ip,
          });

          return {
            id: String(user._id),
            name: user.name as string,
            email: user.email as string,
            role: user.role as string,
            tokenVersion: user.tokenVersion ?? 0,
            rememberMe,
          };
        } catch (error) {
          // Re-throw our known auth errors so the client can show specific messages
          if (
            error instanceof Error &&
            ["MissingCredentials", "InvalidCredentials", "RateLimited"].includes(
              error.message
            )
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
    signIn: "/admin/login",
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "customer";
        token.tokenVersion = user.tokenVersion ?? 0;
        token.rememberMe = user.rememberMe ?? true;

        // If "remember me" is not checked, expire the session in 24 hours
        if (!token.rememberMe) {
          token.exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
        }
      }

      // Session revocation: check if the user's tokenVersion has changed
      if (token.id && token.tokenVersion !== undefined) {
        try {
          await connectToDatabase();
          const dbUser = await User.findById(token.id).select("tokenVersion").lean();
          const dbTokenVersion = (dbUser as UserDocument | null)?.tokenVersion ?? 0;
          if (dbTokenVersion !== token.tokenVersion) {
            // Token version mismatch - session has been revoked
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
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);