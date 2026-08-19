/**
 * Temporary inspection script — lists databases on the Atlas cluster and
 * searches for a given email across each database's `users` collection.
 *
 * Uses the app's mongoose connection (proven to work), with retry/backoff
 * to ride out transient Atlas free-tier throttling.
 *
 * Run with: `node --env-file=.env.local --import tsx scripts/inspect-dbs.ts`
 */
import { connectToDatabase } from "@/lib/db/mongoose";

const EMAIL = process.argv[2] ?? "joshi.mayank5286@gmail.com";
const MAX_ATTEMPTS = 5;
const BACKOFF_MS = 4000;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const mongoErr = err as {
        codeName?: string;
        message?: string;
      } | null;
      const retryable =
        mongoErr?.codeName === "SystemOverloadedError" ||
        /SSL|tlsv1|handshake|MongoServerSelectionError/i.test(mongoErr?.message ?? "");
      if (!retryable || attempt === MAX_ATTEMPTS) throw err;
      console.log(`  ⏳ Attempt ${attempt} failed (${mongoErr?.codeName ?? mongoErr?.message ?? err}); retrying in ${BACKOFF_MS / 1000}s...`);
      await new Promise((r) => setTimeout(r, BACKOFF_MS));
    }
  }
  throw lastErr;
}

async function main() {
  const conn = await connectToDatabase();
  const mongo = conn.connection.getClient();
  console.log("🔎 Inspecting cluster...");

  const adminDb = mongo.db().admin();
  const { databases } = await withRetry(() => adminDb.listDatabases());

  console.log("Databases on cluster:");
  for (const dbInfo of databases) {
    const name = dbInfo.name;
    console.log(`  - ${name} (${dbInfo.sizeOnDisk ?? 0} bytes)`);

    const db = mongo.db(name);
    const collections = await withRetry(() => db.listCollections().toArray());
    if (collections.some((c) => c.name === "users")) {
      const found = await withRetry(() =>
        db.collection("users").findOne({ email: EMAIL })
      );
      if (found) {
        console.log(
          `    ✅ FOUND user in "${name}".role = ${JSON.stringify(found.role)}, _id = ${String(found._id)}`
        );
      } else {
        console.log(`    ℹ️  has "users" collection, but no user with email ${EMAIL}`);
      }
    }
  }

  await mongo.close();
  console.log("✅ Inspection complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Inspection failed:", err);
  process.exit(1);
});
