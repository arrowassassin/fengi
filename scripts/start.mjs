import { spawn } from "node:child_process";
import { cp, mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

const host = process.env.FENGI_HOST || "127.0.0.1";
const localOnly = ["127.0.0.1", "::1", "localhost"].includes(host) && !process.env.FENGI_ORIGIN;
if (
  !localOnly &&
  (!process.env.FENGI_ORIGIN ||
    (!process.env.FENGI_CLIENT_IP_HEADER && process.env.FENGI_ADMISSION_MODE !== "shared"))
)
  throw new Error(
    "Public binding requires FENGI_ORIGIN and FENGI_CLIENT_IP_HEADER from a trusted ingress.",
  );
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
    FENGI_EDITORIAL_PATH: process.env.FENGI_EDITORIAL_PATH || resolve(".data/editorial.sqlite"),
    HOSTNAME: host,
    FENGI_LOCAL_ONLY: localOnly ? "true" : "false",
  },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
server.on("exit", (code) => process.exit(code ?? 1));
