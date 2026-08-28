import { createRng, type ElementType, type Rng, type Specimen } from "../engine";

/**
 * Procedural holo-decal badges + segmented HP rings (approved handoff,
 * design/claude-design-export/README.md "CRITICAL SYSTEM" sections — the
 * generator math is ported verbatim from the artboards' logic script).
 *
 * One deliberate deviation, logged in src/design/COMPONENTS.md: the handoff
 * seeds from a 32-bit name hash; spec §7 [locked] requires the 64-bit recipe
 * hash, so badges seed from `specimen.recipeHash` via the engine rng. Same
 * element = identical badge everywhere still holds.
 *
 * Colors are emitted as design-token `var()` references so the SVG obeys the
 * tokens-only rule (§7c).
 */

export type InkToken = "lime" | "tangerine" | "cyan" | "paper";

const INK_VAR: Record<InkToken, string> = {
  lime: "var(--aa-lime)",
  tangerine: "var(--aa-tangerine)",
  cyan: "var(--aa-cyan)",
  paper: "var(--aa-paper)",
};

/** Handoff palette discipline: tangerine=hostile, cyan=water/info, lime scarce. */
const TYPE_INK: Record<ElementType, InkToken> = {
  fire: "tangerine",
  venom: "tangerine",
  water: "cyan",
  ice: "cyan",
  lightning: "lime",
  earth: "paper",
  air: "paper",
  metal: "paper",
  wood: "paper",
  light: "paper",
  shadow: "paper",
  arcane: "paper",
};

export interface BadgeSpec {
  glyph: string;
  ink: InkToken;
  /** 0 = primitive … 4 = daily boss; spikes = 6 + tier×3. */
  tier: number;
  foil: boolean;
}

export function badgeSpecFor(specimen: Specimen): BadgeSpec {
  const primary = specimen.types[0];
  return {
    glyph: specimen.emoji,
    ink: TYPE_INK[primary],
    tier: Math.min(3, specimen.generation),
    // Foil rarity: deterministic 1-in-8 draw on fused specimens (tier ≥ 2).
    foil: specimen.generation >= 2 && specimen.recipeHash % 8n === 0n,
  };
}

/** Burst polygon points — ported verbatim (viewBox 120, center 60). */
function burstPoints(r: Rng, spikes: number, outer: number, inner: number, jitter: number): string {
  let angle = r.float() * Math.PI * 2;
  const out: string[] = [];
  for (let i = 0; i < 2 * spikes; i++) {
    const radius = (i % 2 === 1 ? inner : outer) * (1 - jitter / 2 + r.float() * jitter);
    out.push(
      `${(60 + radius * Math.cos(angle)).toFixed(1)},${(60 + radius * Math.sin(angle)).toFixed(1)}`,
    );
    angle += Math.PI / spikes;
  }
  return out.join(" ");
}

/** Deterministic badge SVG (120×120 viewBox). */
export function badgeSvg(spec: BadgeSpec, recipeHash: bigint, idSuffix: string): string {
  const r = createRng(recipeHash);
  const spikes = 6 + spec.tier * 3;
  const main = burstPoints(r, spikes, 55, 37, 0.2);
  const under = burstPoints(r, Math.max(5, spikes - 2), 51, 30, 0.3);
  const ink = INK_VAR[spec.ink];
  const gid = `fg-${idSuffix}`;
  const hid = `ht-${idSuffix}`;
  const stroke = spec.foil ? "var(--aa-paper)" : ink;
  const fill = spec.foil ? `url(#${gid})` : "var(--aa-panel)";
  const dotFill = spec.foil ? "var(--aa-ink)" : ink;
  const glyphFill = spec.foil ? "var(--aa-ink)" : ink;

  const parts: string[] = [
    `<svg viewBox="0 0 120 120" class="aa-badge-svg${spec.foil ? " foil" : ""}" role="img">`,
    "<defs>",
    `<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">` +
      '<stop offset="0%" stop-color="var(--aa-cyan)"/>' +
      '<stop offset="50%" stop-color="var(--aa-magenta)"/>' +
      '<stop offset="100%" stop-color="var(--aa-lime)"/></linearGradient>',
    `<pattern id="${hid}" width="7" height="7" patternUnits="userSpaceOnUse">` +
      `<circle cx="2" cy="2" r="1.3" fill="${dotFill}" opacity="${spec.foil ? 0.25 : 0.38}"/></pattern>`,
    "</defs>",
    `<polygon points="${main}" fill="#000" opacity="0.9" transform="translate(5,6)"/>`,
  ];
  if (spec.tier > 1) {
    parts.push(
      `<polygon points="${under}" fill="none" stroke="${stroke}" stroke-width="2" opacity="0.45" transform="rotate(9 60 60)"/>`,
    );
  }
  parts.push(
    `<polygon points="${main}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`,
    `<circle cx="60" cy="60" r="31" fill="url(#${hid})"/>`,
    `<text x="60" y="63" text-anchor="middle" dominant-baseline="middle" ` +
      `font-family="var(--aa-font-emoji)" font-size="40" font-weight="600" fill="${glyphFill}">${spec.glyph}</text>`,
    "</svg>",
  );
  return parts.join("");
}

/** Undiscovered slot: dashed off-white circle + mono `?` (handoff). */
export function lockedBadgeSvg(): string {
  return (
    '<svg viewBox="0 0 120 120" class="aa-badge-svg" role="img">' +
    '<circle cx="60" cy="60" r="43" fill="none" stroke="var(--aa-paper-dim-30)" stroke-width="2.5" stroke-dasharray="8 7"/>' +
    '<text x="60" y="70" text-anchor="middle" font-family="var(--aa-font-mono)" font-size="34" font-weight="700" fill="var(--aa-paper-faint-25)">?</text>' +
    "</svg>"
  );
}

export interface RingOptions {
  /** Last 1–2 filled segments crack tangerine with shard lines. */
  cracked?: boolean;
  /** At zero HP the ring shatters into debris lines. */
  shattered?: boolean;
  seed: bigint;
}

/**
 * Segmented HP ring — 12 arcs, 9° gaps, from 12 o'clock (viewBox 200).
 * `pct` ∈ [0,1]; color is an ink token (lime = player, cyan = opponent).
 */
export function ringSvg(pct: number, color: InkToken, options: RingOptions): string {
  const SEG = 12;
  const R = 87;
  const W = 11;
  const gap = 9;
  const span = (360 - SEG * gap) / SEG;
  const filled = Math.round(Math.max(0, Math.min(1, pct)) * SEG);
  const rng = createRng(options.seed + BigInt(filled));
  const point = (radius: number, angle: number): [number, number] => [
    100 + radius * Math.cos(angle),
    100 + radius * Math.sin(angle),
  ];
  const kids: string[] = [];

  for (let i = 0; i < SEG; i++) {
    const a0 = ((-90 + i * (span + gap)) * Math.PI) / 180;
    const a1 = a0 + (span * Math.PI) / 180;
    if (options.shattered === true) {
      const mid = (a0 + a1) / 2;
      const jitter = (rng.float() - 0.5) * 16;
      const [x0, y0] = point(R + jitter, mid - 0.09);
      const [x1, y1] = point(R + jitter + 9 + rng.float() * 15, mid + 0.14);
      kids.push(
        `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="var(--aa-paper-dim-30)" stroke-width="3"/>`,
      );
      continue;
    }
    const on = i < filled;
    const crack = options.cracked === true && on && i >= filled - 2;
    const [x0, y0] = point(R, a0);
    const [x1, y1] = point(R, a1);
    const strokeColor = on
      ? crack
        ? "var(--aa-tangerine)"
        : INK_VAR[color]
      : "var(--aa-paper-faint-13)";
    kids.push(
      `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)}A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" ` +
        `stroke="${strokeColor}" stroke-width="${on ? W : 5}" fill="none"${crack ? ' stroke-dasharray="7 5"' : ""}/>`,
    );
    if (crack && i === filled - 1) {
      for (let s = 0; s < 3; s++) {
        const angle = a1 + (rng.float() - 0.5) * 0.6;
        const [sx0, sy0] = point(R + 7, angle);
        const [sx1, sy1] = point(R + 16 + rng.float() * 12, angle);
        kids.push(
          `<line x1="${sx0.toFixed(1)}" y1="${sy0.toFixed(1)}" x2="${sx1.toFixed(1)}" y2="${sy1.toFixed(1)}" stroke="var(--aa-tangerine)" stroke-width="3"/>`,
        );
      }
    }
  }
  return `<svg viewBox="0 0 200 200" class="aa-ring-svg">${kids.join("")}</svg>`;
}
