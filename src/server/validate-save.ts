import { sessionFromId, supportsVersion } from "../games/registry";
import { validateV1 } from "../games/releases/v1";
import { recordSchema, type SavedRecord } from "../lib/persistence";
export function validateSave(input: unknown): SavedRecord {
  const record = recordSchema.parse(input),
    session = sessionFromId(record.id);
  if (
    !session ||
    session.game !== record.game ||
    session.mode !== record.mode ||
    !supportsVersion(session.game, session.rulesVersion)
  )
    throw new Error("Unsupported save identity");
  const validators: Record<number, typeof validateV1> = { 1: validateV1 };
  const normalized = validators[session.rulesVersion](session, record.state);
  return {
    version: 1,
    id: session.id,
    game: session.game,
    mode: session.mode,
    label: session.label,
    updated: Date.now(),
    ...normalized,
  };
}
