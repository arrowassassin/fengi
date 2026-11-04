import { defineConfig } from "vitest/config";
export default defineConfig({
  cacheDir: "node_modules/.cache/fengi-vitest",
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
});
