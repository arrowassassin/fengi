export const games = [
  {
    id: "signal",
    name: "Signal Grid",
    category: "Logic",
    time: "3–5 min",
    line: "A little logic. A lovely click.",
    description: "Find the pattern hiding in plain sight.",
    color: "blue",
    version: 1,
  },
  {
    id: "orbit",
    name: "Orbit Tap",
    category: "Arcade",
    time: "45 sec",
    line: "One button. A whole new rhythm.",
    description: "Collect sparks. Slip through the gaps.",
    color: "coral",
    version: 1,
  },
  {
    id: "odd",
    name: "Odd Answer",
    category: "Wordplay",
    time: "2–3 min",
    line: "Take the road less answered.",
    description: "Three prompts. Find an unexpected fit.",
    color: "lilac",
    version: 1,
  },
  {
    id: "trail",
    name: "Trail Trace",
    category: "Strategy",
    time: "2–4 min",
    line: "The scenic route can be the smart one.",
    description: "Gather three seeds. Find your way home.",
    color: "moss",
    version: 1,
  },
  {
    id: "pairs",
    name: "Pair Bloom",
    category: "Memory",
    time: "2–3 min",
    line: "A little attention goes a long way.",
    description: "Turn, remember, and bring pairs together.",
    color: "rose",
    version: 1,
  },
] as const;
export type GameId = (typeof games)[number]["id"];
export function isGameId(value: string): value is GameId {
  return games.some((game) => game.id === value);
}
export function utcDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
export function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    utcDate(new Date(value)) === value
  );
}
export type Session = {
  game: GameId;
  mode: "daily" | "practice";
  seed: string;
  id: string;
  label: string;
  calm: boolean;
};
export function sessionFor(game: GameId, params: URLSearchParams, today = utcDate()): Session {
  const mode = params.get("mode") === "practice" ? "practice" : "daily";
  const date = params.get("date") ?? today;
  const safeDate = validDate(date) && date <= today ? date : today;
  const provided = params.get("seed") ?? "first-light";
  const seed =
    mode === "daily" ? safeDate : /^[a-zA-Z0-9-]{1,48}$/.test(provided) ? provided : "first-light";
  const calm = game === "orbit" && mode === "practice" && params.get("pace") === "calm";
  return {
    game,
    mode,
    seed,
    calm,
    id: `${game}:v1:${mode}:${seed}:${calm ? "calm" : "standard"}`,
    label: mode === "daily" ? safeDate : "Practice",
  };
}
