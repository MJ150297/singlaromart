import { MongoClient } from "mongodb";
import fs from "node:fs";

const uri = fs
  .readFileSync(new URL("../.env.local", import.meta.url), "utf8")
  .match(/MONGODB_URI=(.*)/)?.[1];
if (!uri) { console.error("No MONGODB_URI"); process.exit(1); }

const client = new MongoClient(uri);
await client.connect();
const db = client.db();
const u = db.collection("users");

console.log("$or matchers:");
const found = await u
  .find({
    $or: [{ email: null }, { displayEmail: null }, { phone: null }],
  })
  .project({ _id: 0, name: 1, email: 1, displayEmail: 1, phone: 1 })
  .toArray();
found.forEach((d) => console.log("  ", JSON.stringify(d)));
console.log("  matched count:", found.length);
console.log("email:null:", await u.countDocuments({ email: null }));
console.log("displayEmail:null:", await u.countDocuments({ displayEmail: null }));
console.log("phone:null:", await u.countDocuments({ phone: null }));
console.log("email missing:", await u.countDocuments({ email: { $exists: false } } ));
console.log("displayEmail missing:", await u.countDocuments({ displayEmail: { $exists: false } } ));

await client.close();
console.log("done");