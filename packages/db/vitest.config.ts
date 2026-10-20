import { defineConfig } from "vitest/config";

// Integration tests run against the dev database in docker-compose, sequentially.
export default defineConfig({
  test: { fileParallelism: false, testTimeout: 30_000 },
});
