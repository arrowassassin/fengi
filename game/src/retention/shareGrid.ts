/** Share grid (spec §5): spoiler-safe emoji summary, copy-ready. */

export interface ShareInput {
  outcome: "side0" | "side1" | "draw";
  turns: number;
  date: string;
  playerSquadEmoji: string[];
  opponentSquadEmoji: string[];
  /** Player specimens still standing. */
  playerRemaining: number;
}

export function buildShareGrid(input: ShareInput): string {
  const verdict = input.outcome === "side0" ? "🏆" : input.outcome === "side1" ? "💀" : "🤝";
  const standing = ["⬛", "🟨", "🟨🟨", "🟨🟨🟨"][Math.max(0, Math.min(3, input.playerRemaining))];
  return [
    `Alchemy Arena ${input.date}`,
    `${verdict} in ${input.turns} turns`,
    `${input.playerSquadEmoji.join("")} vs ${input.opponentSquadEmoji.join("")}`,
    `standing: ${standing}`,
  ].join("\n");
}
