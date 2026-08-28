/** Milestone achievements (spec §5). */

export interface PlayerTotals {
  crafts: number;
  discoveries: number;
  wins: number;
  bestStreak: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  emoji: string;
  metric: keyof PlayerTotals;
  threshold: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "a-first-fuse", name: "First Fusion", emoji: "🧪", metric: "crafts", threshold: 1 },
  { id: "a-ten-fuse", name: "Journeyman Alchemist", emoji: "⚗️", metric: "crafts", threshold: 10 },
  { id: "a-fifty-fuse", name: "Master Alchemist", emoji: "🏺", metric: "crafts", threshold: 50 },
  { id: "a-first-find", name: "Pioneer", emoji: "🥇", metric: "discoveries", threshold: 1 },
  { id: "a-five-find", name: "Trailblazer", emoji: "🗺️", metric: "discoveries", threshold: 5 },
  { id: "a-first-win", name: "First Blood", emoji: "⚔️", metric: "wins", threshold: 1 },
  { id: "a-ten-win", name: "Arena Regular", emoji: "🛡️", metric: "wins", threshold: 10 },
  { id: "a-week-streak", name: "Seven Seals", emoji: "🕯️", metric: "bestStreak", threshold: 7 },
  { id: "a-month-streak", name: "Perpetual Flame", emoji: "🔥", metric: "bestStreak", threshold: 28 },
];

export function earnedAchievements(totals: PlayerTotals): string[] {
  return ACHIEVEMENTS.filter((a) => totals[a.metric] >= a.threshold).map((a) => a.id);
}
