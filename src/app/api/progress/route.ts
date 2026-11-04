import { z } from "zod";
import { profile, readBody, respond } from "../../../server/http";
import { getStore, StoreError } from "../../../server/store";
import { validateSave } from "../../../server/validate-save";
export const runtime = "nodejs";
const input = z
  .object({
    record: z.unknown(),
    profileId: z.string().uuid(),
    expectedRevision: z
      .number()
      .int()
      .min(0)
      .max(Number.MAX_SAFE_INTEGER - 1),
    mutationId: z.string().uuid(),
  })
  .strict();
export function GET() {
  return respond("progress.read", async () => {
    const profileId = await profile();
    return { profileId, saves: getStore().list(profileId) };
  });
}
export function PUT(request: Request) {
  return respond("progress.write", async () => {
    const raw = await readBody(request),
      id = await profile(),
      parsed = input.safeParse(raw);
    if (!parsed.success) throw new StoreError(400, "Invalid save envelope.");
    if (parsed.data.profileId !== id)
      throw new StoreError(409, "Your active profile changed. Reload before saving.");
    let record: ReturnType<typeof validateSave>;
    try {
      record = validateSave(parsed.data.record);
    } catch {
      throw new StoreError(422, "Save does not match this game edition.");
    }
    return getStore().save(id, record, parsed.data.expectedRevision, parsed.data.mutationId);
  });
}
