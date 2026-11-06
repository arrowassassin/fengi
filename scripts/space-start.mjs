// Fail closed until the operator explicitly selects the deployment's storage guarantees.
if (!["ephemeral", "persistent"].includes(process.env.FENGI_STORAGE_MODE))
  throw new Error(
    "Set FENGI_STORAGE_MODE to ephemeral (demo) or persistent (verified durable POSIX storage).",
  );
if (!process.env.FENGI_ORIGIN?.startsWith("https://"))
  throw new Error("Set FENGI_ORIGIN to the exact public HTTPS Space origin.");
if (
  process.env.FENGI_STORAGE_MODE === "persistent" &&
  (!process.env.FENGI_DATABASE_PATH?.startsWith("/") ||
    !process.env.FENGI_EDITORIAL_PATH?.startsWith("/"))
)
  throw new Error(
    "Persistent mode requires absolute paths for both databases on verified durable POSIX storage.",
  );
await import("./start.mjs");
