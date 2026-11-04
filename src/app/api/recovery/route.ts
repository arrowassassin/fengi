import { z } from "zod";
import { requestActor } from "../../../server/admission";
import { profile, readBody, renewSession, respond, setSession } from "../../../server/http";
import { getStore, StoreError } from "../../../server/store";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create") }).strict(),
  z.object({ action: z.literal("restore"), code: z.string().regex(/^[\w-]{43}$/) }).strict(),
]);
export function POST(request: Request) {
  return respond("profile.recovery", async () => {
    const parsed = schema.safeParse(await readBody(request));
    if (!parsed.success) throw new StoreError(400, "Invalid recovery request.");
    const db = getStore();
    if (parsed.data.action === "create") {
      const code = db.recovery(await profile());
      await renewSession(request);
      return { code };
    }
    if (!db.hasRecovery(parsed.data.code)) {
      db.limitInvalidRecovery(requestActor(request));
      throw new StoreError(400, "Recovery code is invalid or already used.");
    }
    await setSession(db.recover(parsed.data.code), request);
    return { ok: true };
  });
}
