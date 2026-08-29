import { createRng, fnv1a64 } from "../engine";

/** Daily quests (spec §5): 3 per UTC day, seeded by date + player id. */

export type QuestMetric =
  | "crafts"
  | "battles"
  | "wins"
  | "super-effective-hits"
  | "status-moves-used"
  | "new-discoveries"
  | "boss-attempts";

export interface QuestDef {
  id: string;
  description: string;
  metric: QuestMetric;
  target: number;
  reward: string;
}

const QUEST_TABLE: QuestDef[] = [
  {
    id: "q-craft-2",
    description: "Fuse 2 new specimens",
    metric: "crafts",
    target: 2,
    reward: "🏺",
  },
  {
    id: "q-craft-5",
    description: "Fuse 5 new specimens",
    metric: "crafts",
    target: 5,
    reward: "🏺",
  },
  { id: "q-battle-3", description: "Fight 3 battles", metric: "battles", target: 3, reward: "⚔️" },
  { id: "q-win-1", description: "Win a battle", metric: "wins", target: 1, reward: "🏆" },
  { id: "q-win-3", description: "Win 3 battles", metric: "wins", target: 3, reward: "🏆" },
  {
    id: "q-super-5",
    description: "Land 5 super-effective hits",
    metric: "super-effective-hits",
    target: 5,
    reward: "💥",
  },
  {
    id: "q-status-3",
    description: "Use 3 status moves",
    metric: "status-moves-used",
    target: 3,
    reward: "🧿",
  },
  {
    id: "q-discover-1",
    description: "Make a first discovery",
    metric: "new-discoveries",
    target: 1,
    reward: "🥇",
  },
  {
    id: "q-boss-1",
    description: "Challenge the daily boss",
    metric: "boss-attempts",
    target: 1,
    reward: "👑",
  },
];

export function questsForDay(date: string, playerId: string): QuestDef[] {
  const rng = createRng(fnv1a64(`quests:v1:${date}:${playerId}`));
  const pool = [...QUEST_TABLE];
  const picked: QuestDef[] = [];
  while (picked.length < 3 && pool.length > 0) {
    const [quest] = pool.splice(rng.int(pool.length), 1);
    if (quest !== undefined) picked.push(quest);
  }
  return picked;
}

export type QuestProgress = Record<string, number>;

export interface QuestEvent {
  metric: QuestMetric;
  amount: number;
}

export function updateQuestProgress(
  quests: readonly QuestDef[],
  progress: QuestProgress,
  event: QuestEvent,
): QuestProgress {
  const next: QuestProgress = { ...progress };
  for (const quest of quests) {
    if (quest.metric !== event.metric) continue;
    next[quest.id] = Math.min(quest.target, (next[quest.id] ?? 0) + event.amount);
  }
  return next;
}

export function isQuestComplete(quest: QuestDef, progress: QuestProgress): boolean {
  return (progress[quest.id] ?? 0) >= quest.target;
}
