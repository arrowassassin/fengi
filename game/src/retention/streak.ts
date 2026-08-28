/** Streaks + freezes (spec §5). Dates are UTC "YYYY-MM-DD" strings. */

export interface StreakState {
  lastPlayed: string | null;
  streak: number;
  bestStreak: number;
  freezes: number;
  /** Days a freeze covered, newest last (rendered as freeze wax seals). */
  freezeSpentDates: string[];
}

export const MAX_FREEZES = 2;
const FREEZE_MILESTONE = 7;

export const INITIAL_STREAK: StreakState = {
  lastPlayed: null,
  streak: 0,
  bestStreak: 0,
  freezes: 0,
  freezeSpentDates: [],
};

export function dayNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  if (y === undefined || m === undefined || d === undefined) throw new Error(`bad date ${date}`);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

function dateFromDayNumber(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}

export function recordPlay(state: StreakState, date: string): StreakState {
  if (state.lastPlayed === date) return state;

  let streak: number;
  let freezes = state.freezes;
  const freezeSpentDates = [...state.freezeSpentDates];

  if (state.lastPlayed === null) {
    streak = 1;
  } else {
    const gap = dayNumber(date) - dayNumber(state.lastPlayed);
    if (gap <= 0) return state; // clock went backwards; keep state stable
    if (gap === 1) {
      streak = state.streak + 1;
    } else if (gap - 1 <= freezes) {
      // Auto-spend one freeze per missed day (spec §5).
      for (let missed = 1; missed < gap; missed++) {
        freezeSpentDates.push(dateFromDayNumber(dayNumber(state.lastPlayed) + missed));
      }
      freezes -= gap - 1;
      streak = state.streak + 1;
    } else {
      streak = 1;
    }
  }

  // Every 7 consecutive days banks a freeze, capped at 2.
  if (streak > 0 && streak % FREEZE_MILESTONE === 0) {
    freezes = Math.min(MAX_FREEZES, freezes + 1);
  }

  return {
    lastPlayed: date,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    freezes,
    freezeSpentDates,
  };
}
