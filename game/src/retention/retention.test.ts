import { describe, expect, it } from "vitest";
import { serializeLog } from "../engine";
import { ACHIEVEMENTS, earnedAchievements } from "./achievements";
import { dailyBossSquad } from "./dailyBoss";
import { questsForDay, updateQuestProgress } from "./quests";
import { buildShareGrid } from "./shareGrid";
import { INITIAL_STREAK, recordPlay } from "./streak";
import { weeklyModifierFor } from "./weeklyModifier";

describe("daily boss (spec §5: deterministic from UTC date)", () => {
  it("same date → same boss squad", async () => {
    const a = await dailyBossSquad("2026-08-28");
    const b = await dailyBossSquad("2026-08-28");
    expect(a.map((s) => s.name)).toEqual(b.map((s) => s.name));
    expect(a).toHaveLength(3);
  });

  it("different dates → different squads (usually)", async () => {
    const names = new Set<string>();
    for (const d of ["2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28"]) {
      names.add((await dailyBossSquad(d)).map((s) => s.name).join("|"));
    }
    expect(names.size).toBeGreaterThan(1);
  });
});

describe("streaks + freezes (spec §5: max 2 bankable, auto-spend)", () => {
  it("increments on consecutive days", () => {
    let s = recordPlay(INITIAL_STREAK, "2026-08-01");
    s = recordPlay(s, "2026-08-02");
    s = recordPlay(s, "2026-08-03");
    expect(s.streak).toBe(3);
  });

  it("same-day replays don't double count", () => {
    let s = recordPlay(INITIAL_STREAK, "2026-08-01");
    s = recordPlay(s, "2026-08-01");
    expect(s.streak).toBe(1);
  });

  it("a 1-day gap spends a freeze and keeps the streak", () => {
    let s = { ...recordPlay(INITIAL_STREAK, "2026-08-01"), freezes: 1 };
    s = recordPlay(s, "2026-08-03"); // missed 08-02
    expect(s.streak).toBe(2);
    expect(s.freezes).toBe(0);
    expect(s.freezeSpentDates).toContain("2026-08-02");
  });

  it("a gap with no freezes resets to 1", () => {
    let s = recordPlay(INITIAL_STREAK, "2026-08-01");
    s = recordPlay(s, "2026-08-05");
    expect(s.streak).toBe(1);
  });

  it("earns a freeze at each 7-day milestone, capped at 2", () => {
    let s = INITIAL_STREAK;
    let day = 1;
    for (; day <= 7; day++) s = recordPlay(s, `2026-08-${String(day).padStart(2, "0")}`);
    expect(s.freezes).toBe(1);
    for (; day <= 14; day++) s = recordPlay(s, `2026-08-${String(day).padStart(2, "0")}`);
    expect(s.freezes).toBe(2);
    for (; day <= 21; day++) s = recordPlay(s, `2026-08-${String(day).padStart(2, "0")}`);
    expect(s.freezes).toBe(2); // capped
  });

  it("month boundaries count as consecutive days", () => {
    let s = recordPlay(INITIAL_STREAK, "2026-08-31");
    s = recordPlay(s, "2026-09-01");
    expect(s.streak).toBe(2);
  });
});

describe("daily quests (spec §5: 3/day, seeded by date + player)", () => {
  it("is deterministic per date+player and gives 3 distinct quests", () => {
    const a = questsForDay("2026-08-28", "player-1");
    const b = questsForDay("2026-08-28", "player-1");
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
    expect(new Set(a.map((q) => q.id)).size).toBe(3);
  });

  it("different players usually get different quests", () => {
    const sets = new Set(
      ["p1", "p2", "p3", "p4", "p5"].map((p) =>
        questsForDay("2026-08-28", p)
          .map((q) => q.id)
          .join("|"),
      ),
    );
    expect(sets.size).toBeGreaterThan(1);
  });

  it("progress updates only matching metrics and clamps at target", () => {
    const quests = questsForDay("2026-08-28", "player-1");
    const first = quests[0];
    if (first === undefined) throw new Error("no quests");
    let progress = {};
    for (let i = 0; i < first.target + 5; i++) {
      progress = updateQuestProgress(quests, progress, { metric: first.metric, amount: 1 });
    }
    const record = progress as Record<string, number>;
    expect(record[first.id]).toBe(first.target);
  });
});

describe("achievements", () => {
  it("thresholds unlock cumulatively", () => {
    expect(earnedAchievements({ crafts: 0, discoveries: 0, wins: 0, bestStreak: 0 })).toEqual([]);
    const earned = earnedAchievements({ crafts: 100, discoveries: 10, wins: 25, bestStreak: 30 });
    expect(earned.length).toBeGreaterThan(4);
    for (const id of earned) {
      expect(ACHIEVEMENTS.some((a) => a.id === id)).toBe(true);
    }
  });
});

describe("weekly modifier (spec §5: deterministic per ISO week)", () => {
  it("same week → same modifier; config feeds the engine", () => {
    const a = weeklyModifierFor(new Date(Date.UTC(2026, 7, 26))); // Wed
    const b = weeklyModifierFor(new Date(Date.UTC(2026, 7, 28))); // Fri same ISO week
    expect(a.id).toBe(b.id);
    expect(Object.keys(a.config.typeDamageMultipliers ?? {}).length).toBeGreaterThan(0);
  });

  it("adjacent weeks differ (usually across a sample)", () => {
    const ids = new Set(
      [0, 7, 14, 21, 28].map(
        (offset) => weeklyModifierFor(new Date(Date.UTC(2026, 5, 1 + offset))).id,
      ),
    );
    expect(ids.size).toBeGreaterThan(1);
  });
});

describe("share grid (spec §5: spoiler-safe emoji summary)", () => {
  it("renders result, squad emoji rows, and turn count — no specimen names", () => {
    const grid = buildShareGrid({
      outcome: "side0",
      turns: 14,
      date: "2026-08-28",
      playerSquadEmoji: ["🔥", "🌿", "⚡"],
      opponentSquadEmoji: ["💧", "🪨", "❄️"],
      playerRemaining: 2,
    });
    expect(grid).toContain("Alchemy Arena");
    expect(grid).toContain("2026-08-28");
    expect(grid).toContain("🔥🌿⚡");
    expect(grid).toContain("14");
    expect(grid).not.toMatch(/Primal/);
  });
});

it("weekly modifier keeps battles deterministic end to end", async () => {
  const { aiPolicy, runBattle } = await import("../engine");
  const { STARTERS } = await import("../content/starters");
  const mod = weeklyModifierFor(new Date(Date.UTC(2026, 7, 28)));
  const squad = STARTERS.slice(0, 3);
  const foe = STARTERS.slice(3, 6);
  const r1 = runBattle([squad, foe], 5n, [aiPolicy, aiPolicy], mod.config);
  const r2 = runBattle([squad, foe], 5n, [aiPolicy, aiPolicy], mod.config);
  expect(serializeLog(r1.log)).toBe(serializeLog(r2.log));
});
