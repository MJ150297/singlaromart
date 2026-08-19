import { connectToDatabase } from "./db/mongoose";

/**
 * DB-backed rate limiter using MongoDB with a TTL index.
 * Works across serverless/multi-instance deployments.
 *
 * Usage:
 *   const limited = await checkRateLimit({ key: "signup", identifier: ip, limit: 3, windowMs: 3600000 });
 *   if (limited) return NextResponse.json({ success: false, error: limited }, { status: 429 });
 */

interface RateLimitEntry {
  key: string;
  identifier: string;
  count: number;
  expiresAt: Date;
}

async function ensureCollection() {
  const conn = await connectToDatabase();
  const db = conn.connection.db;
  if (!db) throw new Error("No database connection available");

  const collection = db.collection<RateLimitEntry>("ratelimits");

  // listIndexes (collection.indexes()) throws NamespaceNotFound if the
  // collection doesn't exist yet, so create it explicitly first.
  const exists = await db.listCollections({ name: "ratelimits" }).hasNext();
  if (!exists) {
    await db.createCollection("ratelimits");
  }

  // Create TTL index on expiresAt (auto-deletes expired docs).
  // createIndex is a no-op when an identical index already exists.
  await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  return collection;
}

/**
 * Checks the rate limit for a given key + identifier.
 * @returns null if allowed, or an error message string if rate-limited.
 */
export async function checkRateLimit({
  key,
  identifier,
  limit,
  windowMs,
}: {
  key: string;
  identifier: string;
  limit: number;
  windowMs: number;
}): Promise<string | null> {
  if (!identifier) return null;

  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowMs);
  const collection = await ensureCollection();

  // Remove any stale (expired) entries for this key+identifier first.
  // This avoids upsert conflicts and resets the window correctly.
  await collection.deleteMany({
    key,
    identifier,
    expiresAt: { $lte: now },
  });

  const result = await collection.findOneAndUpdate(
    { key, identifier },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: windowEnd },
    },
    {
      upsert: true,
      returnDocument: "after",
      includeResultMetadata: true,
    }
  );

  const doc = result?.value as RateLimitEntry | null;

  if (!doc) {
    // Upsert raced or failed; treat as allowed
    return null;
  }

  if (doc.count > limit) {
    const retryAfterMs = Math.max(0, doc.expiresAt.getTime() - now.getTime());
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    const retryAfterMin = Math.ceil(retryAfterSec / 60);
    return `Too many attempts. Please try again in ${retryAfterMin} minute(s).`;
  }

  return null;
}

/**
 * Clears rate limit entries for a key + identifier (e.g., after successful login).
 */
export async function clearRateLimit({
  key,
  identifier,
}: {
  key: string;
  identifier: string;
}): Promise<void> {
  if (!identifier) return;
  const collection = await ensureCollection();
  await collection.deleteMany({ key, identifier });
}

/**
 * Helper to extract the client IP from a Next.js Request.
 * In development, x-forwarded-for / x-real-ip headers are not set,
 * so we fall back to a stable dev identifier to avoid locking out
 * all local attempts with the same "unknown" bucket.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  // In development, use a stable identifier so rate limiting still works
  // per-browser/session rather than lumping all local traffic together.
  if (process.env.NODE_ENV === "development") {
    return "dev-local";
  }

  return "unknown";
}
