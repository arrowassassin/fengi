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
  rulesVersion: number;
  mode: "daily" | "practice";
  seed: string;
  id: string;
  label: string;
  calm: boolean;
};
export type Release = { version: number; from: string };
export type GameRelease = { id: GameId; version: number; releases: readonly Release[] };
// Add a new release and activation date when rules/content change. Never repoint v1 engines.
export const gameReleases: readonly GameRelease[] = games.map((game) => ({
  id: game.id,
  version: game.version,
  releases: [
    { version: 1, from: "0000-01-01" },
    ...(["trail", "signal", "pairs", "orbit"].includes(game.id)
      ? [{ version: 2, from: "9999-12-31" }]
      : []),
  ],
}));
export function supportsVersion(game: GameId, version: number) {
  return (
    gameReleases.find((g) => g.id === game)?.releases.some((r) => r.version === version) ?? false
  );
}
export function sessionFor(
  game: GameId,
  params: URLSearchParams,
  today = utcDate(),
  registry: readonly GameRelease[] = gameReleases,
): Session {
  const mode = params.get("mode") === "practice" ? "practice" : "daily";
  const date = params.get("date") ?? today;
  const safeDate = validDate(date) && date <= today ? date : today;
  const provided = params.get("seed") ?? "first-light";
  const seed =
    mode === "daily" ? safeDate : /^[a-zA-Z0-9-]{1,48}$/.test(provided) ? provided : "first-light";
  const calm = game === "orbit" && mode === "practice" && params.get("pace") === "calm";
  const entry = registry.find((g) => g.id === game);
  if (!entry) throw new Error("Unregistered game");
  const requested = params.get("version");
  const active =
    mode === "daily"
      ? [...entry.releases]
          .sort((a, b) => b.from.localeCompare(a.from))
          .find((r) => r.from <= safeDate)?.version
      : entry.version;
  const rulesVersion =
    requested === null
      ? (active ?? entry.version)
      : /^[1-9][0-9]{0,3}$/.test(requested)
        ? Number(requested)
        : 0;
  return {
    game,
    rulesVersion,
    mode,
    seed,
    calm,
    id: `${game}:v${rulesVersion}:${mode}:${seed}:${calm ? "calm" : "standard"}`,
    label: mode === "daily" ? safeDate : "Practice",
  };
}

export function sessionFromId(id: string): Session | null {
  const match =
    /^([a-z]+):v([1-9][0-9]{0,3}):(daily|practice):([a-zA-Z0-9-]{1,48}):(calm|standard)$/.exec(id);
  if (!match || !isGameId(match[1])) return null;
  const [, game, version, mode, seed, pace] = match;
  if (mode === "daily" && (!validDate(seed) || seed > utcDate())) return null;
  if (pace === "calm" && (game !== "orbit" || mode !== "practice")) return null;
  return {
    game: game as GameId,
    rulesVersion: Number(version),
    mode: mode as Session["mode"],
    seed,
    calm: pace === "calm",
    id,
    label: mode === "daily" ? seed : "Practice",
  };
}
export function sessionHref(session: Session): string {
  const query = new URLSearchParams({ version: String(session.rulesVersion) });
  if (session.mode === "daily") query.set("date", session.seed);
  else {
    query.set("mode", "practice");
    query.set("seed", session.seed);
  }
  if (session.calm) query.set("pace", "calm");
  return `/play/${session.game}?${query}`;
}
