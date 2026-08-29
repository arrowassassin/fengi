/// <reference types="vitest/config" />
import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages serves the site from /<repo>/ — overridable for other hosts.
  base: process.env.VITE_BASE ?? "/fengi/",
  build: {
    target: "es2023",
    sourcemap: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "eval/**/*.test.ts"],
  },
});
