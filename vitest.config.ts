import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  // DB integration files share one test database, so run files one at a time.
  test: { include: ["tests/**/*.test.ts"], testTimeout: 60_000, hookTimeout: 120_000, fileParallelism: false },
});
