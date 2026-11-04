// Frozen v1 save validation and descriptions; do not use current-version engine facades here.
import { z } from "zod";
import { dailyPrompts, judge } from "../odd/v1/engine";
import { orbitScore } from "../orbit/v1/engine";
import { createDeck } from "../pairs/v1/engine";
import type { Session } from "../registry";
import { createPuzzle, isSolved } from "../signal/v1/engine";
import { createGarden, pathMask, validPath } from "../trail/v1/engine";

const count = z.number().int().min(0).max(1_000_000);
const cells = z.array(z.union([z.literal(-1), z.literal(0), z.literal(1)])).length(25);
export function validateV1(session: Session, value: unknown) {
  switch (session.game) {
    case "signal": {
      const s = z
        .object({ cells, history: z.array(cells).max(100), moves: count, hints: count })
        .strict()
        .parse(value);
      const p = createPuzzle(session.seed);
      if (
        ![s.cells, ...s.history].every((b) =>
          b.every((v, i) => p.givens[i] === -1 || p.givens[i] === v),
        )
      )
        throw new Error("Invalid clues");
      return {
        state: s,
        completed: isSolved(s.cells, p),
        summary: `${s.moves} moves · ${s.hints} reveals`,
      };
    }
    case "trail": {
      const s = z
        .object({ path: z.array(z.number().int().min(0).max(35)).min(1).max(1001) })
        .strict()
        .parse(value);
      const p = createGarden(session.seed);
      if (!validPath(s.path, p)) throw new Error("Invalid path");
      return {
        state: s,
        completed: s.path.at(-1) === 35 && pathMask(s.path, p.seeds) === 7,
        summary: `${s.path.length - 1} moves · optimal ${p.optimum}`,
      };
    }
    case "pairs": {
      const s = z
        .object({ matched: z.array(z.number().int().min(0).max(15)).max(16), turns: count })
        .strict()
        .parse(value);
      const deck = createDeck(session.seed),
        m = s.matched;
      if (
        new Set(m).size !== m.length ||
        m.length % 2 ||
        s.turns < m.length / 2 ||
        !m.every((i) => m.filter((j) => deck[i] === deck[j]).length === 2)
      )
        throw new Error("Invalid pairs");
      return { state: s, completed: m.length === 16, summary: `${s.turns} turns · 8 pairs` };
    }
    case "odd": {
      const s = z
          .object({ answers: z.array(z.string().max(80).nullable()).max(3) })
          .strict()
          .parse(value),
        p = dailyPrompts(session.seed);
      if (!s.answers.every((a, i) => a === null || judge(p[i], a)))
        throw new Error("Invalid answers");
      return {
        state: s,
        completed: s.answers.length === 3,
        summary: `${s.answers.reduce((n, a, i) => n + (a ? (judge(p[i], a)?.points ?? 0) : 0), 0)} points`,
      };
    }
    case "orbit": {
      const s = z
        .object({
          tick: z.number().int().min(0).max(2700),
          angle: z
            .number()
            .min(0)
            .max(Math.PI * 2),
          direction: z.union([z.literal(1), z.literal(-1)]),
          sparks: z.number().int().min(0).max(2700),
          lives: z.number().int().min(0).max(3),
          cooldown: z.number().int().min(0).max(70),
          done: z.boolean(),
        })
        .strict()
        .parse(value);
      if (s.done !== (s.lives === 0 || s.tick === 2700)) throw new Error("Invalid terminal state");
      return {
        state: s,
        completed: s.done,
        summary: `${orbitScore(s)} points${session.calm ? " · calm" : ""}`,
      };
    }
  }
}
