import {
  CATEGORIES,
  EFFECTS,
  isElementType,
  type Move,
  type MoveCategory,
  type MoveEffect,
  type TypePair,
} from "../engine";

/** The exact shape the LLM must return (spec §3). */
export interface CraftedElement {
  name: string;
  emoji: string;
  types: TypePair;
  moves: [Move, Move, Move, Move];
  flavor: string;
}

export type ParseResult = { ok: true; value: CraftedElement } | { ok: false; error: string };

const MAX_FLAVOR = 140;
const MAX_NAME = 40;

function fail(error: string): ParseResult {
  return { ok: false, error };
}

/** Pull the first JSON object out of raw model text (fences/prose tolerated). */
function extractJson(raw: string): unknown | undefined {
  const start = raw.indexOf("{");
  if (start === -1) return undefined;
  // Walk to the matching close brace so trailing prose doesn't break parsing.
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (escaped) {
      escaped = false;
    } else if (ch === "\\") {
      escaped = true;
    } else if (ch === '"') {
      inString = !inString;
    } else if (!inString) {
      if (ch === "{") depth += 1;
      if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          try {
            return JSON.parse(raw.slice(start, i + 1));
          } catch {
            return undefined;
          }
        }
      }
    }
  }
  return undefined;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeText(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const trimmed = v.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseIntIn(v: unknown, min: number, max: number): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  const n = Math.round(v);
  return n >= min && n <= max ? n : undefined;
}

function parseMove(v: unknown, index: number): Move | string {
  if (!isRecord(v)) return `move ${index} is not an object`;
  const name = normalizeText(v.name);
  if (name === undefined || name.length > MAX_NAME) return `move ${index} has a bad name`;
  const type = typeof v.type === "string" ? v.type.toLowerCase() : "";
  if (!isElementType(type)) return `move ${index} has unknown type "${String(v.type)}"`;
  const category =
    typeof v.category === "string" ? (v.category.toLowerCase() as MoveCategory) : "physical";
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    return `move ${index} has unknown category`;
  }
  const isStatus = category === "status";
  const power = isStatus ? 0 : parseIntIn(v.power, 10, 150);
  if (power === undefined) return `move ${index} power out of range`;
  const accuracy = parseIntIn(v.accuracy, 30, 100);
  if (accuracy === undefined) return `move ${index} accuracy out of range`;
  const pp = parseIntIn(v.pp, 1, 40);
  if (pp === undefined) return `move ${index} pp out of range`;
  const effect = typeof v.effect === "string" ? (v.effect.toLowerCase() as MoveEffect) : "none";
  if (!(EFFECTS as readonly string[]).includes(effect)) {
    return `move ${index} has effect outside the closed vocabulary`;
  }
  const effectChance =
    effect === "none" ? 0 : (parseIntIn(v.effectChance, 0, 100) ?? (isStatus ? 100 : 20));
  return { name, type, category, power, accuracy, pp, effect, effectChance };
}

export function parseCrafted(raw: string): ParseResult {
  const data = extractJson(raw);
  if (data === undefined) return fail("no JSON object found in model output");
  if (!isRecord(data)) return fail("payload is not an object");

  const name = normalizeText(data.name);
  if (name === undefined || name.length > MAX_NAME) return fail("bad name");

  const emoji = normalizeText(data.emoji);
  if (emoji === undefined || [...emoji].length > 3) return fail("bad emoji");

  if (!Array.isArray(data.types) || data.types.length < 1 || data.types.length > 2) {
    return fail("types must have 1-2 entries");
  }
  const types: string[] = [];
  for (const t of data.types) {
    const low = typeof t === "string" ? t.toLowerCase() : "";
    if (!isElementType(low)) return fail(`unknown element type "${String(t)}"`);
    if (!types.includes(low)) types.push(low);
  }

  if (!Array.isArray(data.moves) || data.moves.length !== 4) {
    return fail("moves must have exactly 4 entries");
  }
  const moves: Move[] = [];
  for (let i = 0; i < 4; i++) {
    const parsed = parseMove(data.moves[i], i);
    if (typeof parsed === "string") return fail(parsed);
    moves.push(parsed);
  }

  const flavor = normalizeText(data.flavor) ?? "";
  if (flavor.length > MAX_FLAVOR) return fail("flavor exceeds 140 characters");

  return {
    ok: true,
    value: {
      name,
      emoji,
      types: types as TypePair,
      moves: moves as [Move, Move, Move, Move],
      flavor,
    },
  };
}
