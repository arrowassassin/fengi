import { cookies } from "next/headers";
import { COOKIE, profile, readBody, respond, setSession } from "../../../server/http";
import { getStore, StoreError } from "../../../server/store";
export const runtime = "nodejs";
export function POST(request: Request) {
  return respond("profile.create", async () => {
    await readBody(request);
    const db = getStore();
    const existing = (await cookies()).get(COOKIE)?.value;
    if (!db.identify(existing)) {
      if (existing)
        throw new StoreError(
          401,
          "This profile session expired or was deleted. Restore your profile using a recovery code.",
        );
      db.limit("profile:create", 120);
      await setSession(db.create(), request);
    }
    return { ok: true };
  });
}
export function DELETE(request: Request) {
  return respond("profile.delete", async () => {
    await readBody(request);
    getStore().delete(await profile());
    (await cookies()).delete(COOKIE);
    return { ok: true };
  });
}
