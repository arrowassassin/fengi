/**
 * Spoiler-free share (handoff 1c): mono Wordle-style clipboard text. Platform
 * emoji are correct here — it's clipboard text, not element art.
 */

export interface ShareInput {
  outcome: "side0" | "side1" | "draw";
  turns: number;
  date: string;
  playerSquadEmoji: string[];
  opponentSquadEmoji: string[];
  /** Player specimens still standing. */
  playerRemaining: number;
  /** Current streak days + whether a freeze is currently banked. */
  streakDays?: number;
  freezesBanked?: number;
  /**
   * Wordle-style spoiler guard: a shared daily-boss result must not reveal
   * the day's boss composition to players who haven't fought it yet.
   */
  maskOpponent?: boolean;
  /** Daily battles are labeled DAILY; anything else MATCH. */
  daily?: boolean;
}

export function buildShareGrid(input: ShareInput): string {
  const won = input.outcome === "side0";
  const squares = Array.from({ length: Math.min(8, Math.max(1, input.turns)) }, (_, i) =>
    won ? (i % 3 === 2 ? "🟧" : "🟩") : i % 3 === 2 ? "🟩" : "🟧",
  ).join("");
  const lines = [
    `ALCHEMY ARENA · ${input.daily === true ? "DAILY" : "MATCH"} ${input.date}`,
    `${squares} ${input.turns} TURNS ${won ? "🏆" : input.outcome === "draw" ? "🤝" : "💀"}`,
    `${input.playerSquadEmoji.join(" ")} SQUAD · ${Math.max(0, Math.min(3, input.playerRemaining))}/3 STOOD`,
  ];
  if (input.maskOpponent !== true && input.opponentSquadEmoji.length > 0) {
    lines.push(`VS ${input.opponentSquadEmoji.join(" ")}`);
  }
  if (input.streakDays !== undefined) {
    lines.push(
      `🔥${input.streakDays} 🧊${input.freezesBanked ?? 0} STREAK${
        (input.freezesBanked ?? 0) > 0 ? " · FREEZE HELD" : ""
      }`,
    );
  }
  return lines.join("\n");
}
