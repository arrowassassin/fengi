import { createRng } from "../engine";

/**
 * Sigil seal artwork (spec §7e), ported from docs/prototypes/sigil-seals-demo.html
 * and upgraded from the prototype's 32-bit hash to the 64-bit recipe hash
 * (FNV-1a 64 → splitmix64 → sfc32, via the engine rng).
 *
 * Geometry is computed pure — a deterministic command list in unit-square
 * coordinates — so the art is testable in node and identical on every device.
 * Painting is a thin canvas shell that resolves colors from design tokens.
 */

export type SigilStrokeToken = "brass" | "brass-faint" | "ink";

export type SigilCommand =
  | { op: "ring"; r: number; stroke: SigilStrokeToken; dashed: boolean }
  | { op: "spoke"; angle: number; r0: number; r1: number }
  | { op: "mark"; x: number; y: number; shape: "dot" | "tick" }
  | { op: "glyph"; emoji: string; scale: number };

export function sigilCommands(recipeHash: bigint, emoji: string): SigilCommand[] {
  const rng = createRng(recipeHash);
  const commands: SigilCommand[] = [];

  const rings = 2 + rng.int(3); // 2..4
  for (let i = 0; i < rings; i++) {
    const r = Math.min(0.5, (0.3 + 0.075 * i) * (0.8 + rng.float() * 0.1));
    commands.push({ op: "ring", r, stroke: i % 2 === 1 ? "brass-faint" : "brass", dashed: false });
    if (rng.chance(50)) {
      commands.push({ op: "ring", r: r * 0.93, stroke: "brass-faint", dashed: true });
    }
  }

  const spokes = 5 + rng.int(7); // 5..11
  const rotation = rng.float() * Math.PI * 2;
  const r0 = 0.26;
  const r1 = 0.34 + rng.float() * 0.06;
  for (let i = 0; i < spokes; i++) {
    const angle = rotation + (i / spokes) * Math.PI * 2;
    commands.push({ op: "spoke", angle, r0, r1 });
    if (rng.chance(60)) {
      const markRadius = Math.min(0.48, r1 + 0.03);
      commands.push({
        op: "mark",
        x: 0.5 + Math.cos(angle) * markRadius,
        y: 0.5 + Math.sin(angle) * markRadius,
        shape: rng.chance(50) ? "dot" : "tick",
      });
    }
  }

  commands.push({ op: "glyph", emoji, scale: 0.26 + rng.int(5) / 100 });
  return commands;
}

export interface SigilPalette {
  brass: string;
  brassFaint: string;
  ink: string;
  emojiFont: string;
}

/** Paints a command list onto a square canvas 2D context. */
export function paintSigil(
  ctx: CanvasRenderingContext2D,
  size: number,
  commands: readonly SigilCommand[],
  palette: SigilPalette,
): void {
  const c = size / 2;
  const strokeColor = (token: SigilStrokeToken): string =>
    token === "brass" ? palette.brass : token === "brass-faint" ? palette.brassFaint : palette.ink;

  ctx.clearRect(0, 0, size, size);
  ctx.lineWidth = Math.max(1, size * 0.008);

  for (const cmd of commands) {
    switch (cmd.op) {
      case "ring":
        ctx.save();
        if (cmd.dashed) ctx.setLineDash([size * 0.02, size * 0.03]);
        ctx.strokeStyle = strokeColor(cmd.stroke);
        ctx.beginPath();
        ctx.arc(c, c, cmd.r * size, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        break;
      case "spoke":
        ctx.strokeStyle = palette.brass;
        ctx.beginPath();
        ctx.moveTo(c + Math.cos(cmd.angle) * cmd.r0 * size, c + Math.sin(cmd.angle) * cmd.r0 * size);
        ctx.lineTo(c + Math.cos(cmd.angle) * cmd.r1 * size, c + Math.sin(cmd.angle) * cmd.r1 * size);
        ctx.stroke();
        break;
      case "mark":
        ctx.strokeStyle = palette.brass;
        ctx.beginPath();
        if (cmd.shape === "dot") {
          ctx.arc(cmd.x * size, cmd.y * size, size * 0.012, 0, Math.PI * 2);
        } else {
          ctx.moveTo(cmd.x * size - size * 0.012, cmd.y * size);
          ctx.lineTo(cmd.x * size + size * 0.012, cmd.y * size);
        }
        ctx.stroke();
        break;
      case "glyph":
        ctx.fillStyle = palette.ink;
        ctx.font = `${size * cmd.scale}px ${palette.emojiFont}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cmd.emoji, c, c + size * 0.01);
        break;
    }
  }
}
