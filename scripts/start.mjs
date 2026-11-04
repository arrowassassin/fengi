import { spawn } from "node:child_process";
import { cp, mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

// Next's standalone server requires its static assets alongside the traced bundle.
await mkdir(".next/standalone/.next", { recursive: true });
await cp(".next/static", ".next/standalone/.next/static", { recursive: true });
try {
  await stat("public");
  await cp("public", ".next/standalone/public", { recursive: true });
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const server = spawn(process.execPath, [".next/standalone/server.js"], {
  stdio: "inherit",
  env: {
    ...process.env,
    FENGI_DATABASE_PATH: process.env.FENGI_DATABASE_PATH || resolve(".data/fengi.sqlite"),
    HOSTNAME: process.env.FENGI_HOST || "0.0.0.0",
  },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
server.on("exit", (code) => process.exit(code ?? 1));
