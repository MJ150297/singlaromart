import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for the pricing/promotions engine.
 *
 * - Pure Node environment (no DOM needed for unit tests).
 * - `@/` alias mirrors the Next.js tsconfig `paths` so tests use the same
 *   import style as the app.
 * - Longer timeouts so mongodb-memory-server (used by later integration
 *   tests) has time to download/start its binary on first run.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});