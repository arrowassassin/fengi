import { describeGarden, gardenState } from "../games/garden-state";
import { orbitDefinition, pairDefinition, signalDefinition } from "../games/generated-definitions";
import { sessionFromId, supportsVersion } from "../games/registry";
import { validateV1 } from "../games/releases/v1";
import { recordSchema, type SavedRecord } from "../lib/persistence";
import { retainedGarden, retainedPack } from "./editorial";
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
  const normalized = (() => {
    if (session.rulesVersion === 2 && ["signal", "pairs", "orbit"].includes(session.game)) {
      if (session.mode !== "practice") throw new Error("Practice only");
      const p = retainedPack(session.seed)?.pack;
      if (!p) throw new Error("Unknown reviewed pack");
      const definition =
        session.game === "signal"
          ? signalDefinition(p.signal)
          : session.game === "pairs"
            ? pairDefinition(p.pairs)
            : orbitDefinition(p.orbit);
      const state = definition.validate(session, record.state);
      if (!state) throw new Error("Invalid generated save");
      return { state, ...definition.describe(session, state as never) };
    }
    if (session.game === "trail" && session.rulesVersion === 2) {
      if (session.mode !== "practice") throw new Error("Garden practice only");
      const edition = retainedGarden(session.seed);
      if (!edition?.garden) throw new Error("Unknown reviewed garden");
      const state = gardenState(edition.garden, record.state);
      return { state, ...describeGarden(edition.garden, state) };
    }
    return validators[session.rulesVersion](session, record.state);
  })();
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
