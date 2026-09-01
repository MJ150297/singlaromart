/**
 * One-time, idempotent repair for the users collection's email index.
 *
 * Run with:
 *   node --env-file=.env.local --import tsx scripts/fix-users-email-index.ts
 */
import { connectToDatabase } from "@/lib/db/mongoose";
import { User } from "@/lib/models/User";

async function main() {
  const conn = await connectToDatabase();
  const col = conn.connection.collection("users");

  const indexSummary = async () =>
    (await col.indexes()).map((index) => ({
      name: index.name,
      key: index.key,
      unique: index.unique ?? false,
      sparse: index.sparse ?? false,
    }));
  const nullSummary = async () => ({
    email: await col.countDocuments({ email: { $type: "null" } }),
    displayEmail: await col.countDocuments({ displayEmail: { $type: "null" } }),
    phone: await col.countDocuments({ phone: { $type: "null" } }),
  });

  try {
    console.log("Before repair:");
    console.log(`  indexes: ${JSON.stringify(await indexSummary())}`);
    console.log(`  explicit null fields: ${JSON.stringify(await nullSummary())}`);

    // Drop the stale index before normalization so duplicate null keys cannot
    // make the multi-document update fail.
    const emailIndex = (await col.indexes()).find((i) => i.name === "email_1");
    if (emailIndex) {
      const isEmailIndex =
        emailIndex.key?.email === 1 && Object.keys(emailIndex.key).length === 1;
      if (!isEmailIndex || !emailIndex.unique) {
        throw new Error(
          `Unexpected email_1 definition; refusing to drop it: ${JSON.stringify(emailIndex)}`,
        );
      }
      if (emailIndex.sparse) {
        console.log("email_1 is already unique+sparse; skipping drop.");
      } else {
        await col.dropIndex("email_1");
        console.log("Dropped stale non-sparse email_1 index.");
      }
    } else {
      console.log("email_1 not found; syncIndexes will create it from the schema.");
    }

    const unsetResult = await col.updateMany(
      {
        $or: [
          { email: { $type: "null" } },
          { displayEmail: { $type: "null" } },
          { phone: { $type: "null" } },
        ],
      },
      { $unset: { email: "", displayEmail: "", phone: "" } },
    );
    console.log(
      `Unset explicit nulls: matched ${unsetResult.matchedCount}, modified ${unsetResult.modifiedCount}`,
    );

    await User.syncIndexes();

    const finalIndexes = await indexSummary();
    const finalNulls = await nullSummary();
    const finalEmailIndex = finalIndexes.find((i) => i.name === "email_1");
    if (
      !finalEmailIndex ||
      !finalEmailIndex.unique ||
      !finalEmailIndex.sparse ||
      finalNulls.email !== 0
    ) {
      throw new Error(
        `Repair verification failed: email_1=${JSON.stringify(finalEmailIndex)}, nulls=${JSON.stringify(finalNulls)}`,
      );
    }

    console.log("\nAfter repair:");
    console.log(`  indexes: ${JSON.stringify(finalIndexes)}`);
    console.log(`  explicit null fields: ${JSON.stringify(finalNulls)}`);
    console.log(
      `  documents where email is null or missing: ${await col.countDocuments({ email: null })}`,
    );
  } finally {
    await conn.disconnect();
  }
}

main().catch((err) => {
  console.error("❌ Repair failed:", err);
  process.exit(1);
});
