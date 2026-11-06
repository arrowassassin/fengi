import { getStore } from "../src/server/store";

const store = getStore();
try {
  const apply = process.argv.includes("--apply");
  console.log(
    JSON.stringify({
      mode: apply ? "apply" : "dry-run",
      expiredEmptyProfiles: store.cleanup(!apply),
      batchLimit: 100,
    }),
  );
} finally {
  store.close();
}
