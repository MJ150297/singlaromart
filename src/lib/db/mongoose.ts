import mongoose from "mongoose";
import { config } from "../config";

/**
 * Global cache to prevent connection duplication across hot reloads in dev.
 * In production, a single connection is reused for the server's lifetime.
 *
 * We cache the *promise* (not the resolved connection) so that concurrent
 * callers all await the same in-flight connect() call. This prevents a race
 * where multiple requests each start their own mongoose.connect() and then
 * attempt model operations before the connection is ready (which throws when
 * bufferCommands is false).
 */
const globalForMongoose = globalThis as unknown as {
  mongooseConn?: Promise<typeof mongoose>;
};

const MONGODB_URI = config.mongodbUri;

if (!MONGODB_URI) {
  throw new Error(
    "MONGODB_URI is not defined. Add it to .env.local or set config.mongodbUri."
  );
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (!globalForMongoose.mongooseConn) {
    globalForMongoose.mongooseConn = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
      })
      .catch((err) => {
        // Reset the cache so a subsequent call can retry the connection.
        globalForMongoose.mongooseConn = undefined;
        throw err;
      });
  }

  return globalForMongoose.mongooseConn;
}