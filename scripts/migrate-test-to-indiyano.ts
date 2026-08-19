/**
 * One-time migration — copies data from the legacy `test` database
 * (where users were created because the original MONGODB_URI had no DB name)
 * into the intended `indiyano` database.
 *
 * Idempotent: existing documents in `indiyano` are left untouched, and
 * documents are only inserted if they don't already exist (by _id or unique keys).
 *
 * Run with: `node --env-file=.env.local --import tsx scripts/migrate-test-to-indiyano.ts`
 */
import { connectToDatabase } from "@/lib/db/mongoose";

async function main() {
  const conn = await connectToDatabase();
  const mongo = conn.connection.getClient();
  const srcDb = mongo.db("test");
  const dstDb = mongo.db("indiyano");

  const collections = (await srcDb.listCollections().toArray())
    .map((c) => c.name)
    // The rate-limiter TTL collection is ephemeral; no need to migrate it.
    .filter((name) => !name.startsWith("system.") && name !== "ratelimits");

  console.log(`Migrating ${collections.join(", ") || "(nothing)"} from 'test' -> 'indiyano'...\n`);

  for (const name of collections) {
    const srcCol = srcDb.collection(name);
    const dstCol = dstDb.collection(name);

    const docs = await srcCol.find().toArray();
    if (docs.length === 0) {
      console.log(`  - ${name}: empty, skipping`);
      continue;
    }

    let inserted = 0;
    for (const doc of docs) {
      const { _id, ...rest } = doc;
      try {
        // Apply schema defaults for the users collection, since raw insertOne
        // bypasses Mongoose defaults (otherwise e.g. tokenVersion is missing).
        if (name === "users") {
          rest.tokenVersion = rest.tokenVersion ?? 0;
        }
        await dstCol.insertOne({ _id, ...rest });
        inserted++;
      } catch (err: unknown) {
        if ((err as { code?: number } | null)?.code === 11000) {
          // Duplicate key (_id or unique index) — already present in indiyano.
          continue;
        }
        throw err;
      }
    }

    console.log(`  - ${name}: ${inserted} document(s) copied (${docs.length} in source)`);
  }

  await mongo.close();
  console.log("\n✅ Migration complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});