import { draftContent } from "../src/server/content-draft";
import { EditorialStore, editorialPath } from "../src/server/editorial";

// Operator-only CLI. No public endpoint invokes a model or changes editorial state.
const [action, id, hash, actor] = process.argv.slice(2);
let store: EditorialStore | undefined;
try {
  store = new EditorialStore(editorialPath());
  if (action === "generate") {
    const rights = process.env.FENGI_AI_RIGHTS_REFERENCE;
    if (!rights?.trim()) throw new Error("Rights approval reference required");
    const result = await draftContent(new Date().toISOString());
    const edition = store.create(result, process.env.NVIDIA_MODEL || "", rights);
    console.log(
      JSON.stringify({
        id: edition?.id,
        digest: edition?.digest,
        source: result.source,
        reason: result.reason,
        state: "draft",
      }),
    );
  } else if (action === "review" && id) {
    // Explicit review is the only command that prints prose. Never called by live verification.
    const edition = store.get(id);
    if (!edition) throw new Error("Unknown edition");
    console.log(JSON.stringify(edition, null, 2));
  } else if (["approve", "publish", "revoke"].includes(action) && id && hash && actor) {
    const edition = store.transition(id, hash, action as "approve" | "publish" | "revoke", actor);
    console.log(JSON.stringify({ id, digest: edition?.digest, state: edition?.state }));
  } else {
    throw new Error("Invalid command");
  }
} catch {
  console.error(
    "Editorial command failed. Check command arguments, rights approval, review digest and storage. No provider details are logged.",
  );
  process.exitCode = 1;
} finally {
  store?.db.close();
}
