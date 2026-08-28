import { STARTERS } from "../content/starters";
import { DeterministicAdapter } from "../craft/adapters/deterministic";
import type { CraftAdapter } from "../craft/adapters/types";
import { craftElement } from "../craft/pipeline";
import { hashToHex, type Specimen } from "../engine";
import { deserializeSpecimen, type SerializedSpecimen, serializeSpecimen } from "../persist/codec";
import { defaultBackend, type StorageBackend, VersionedStore } from "../persist/store";
import type { DiscoveryRecord, RegistryClient } from "../registry/client";
import { LocalRegistry } from "../registry/local";
import type { PlayerTotals } from "../retention/achievements";
import {
  type QuestEvent,
  type QuestProgress,
  questsForDay,
  updateQuestProgress,
} from "../retention/quests";
import { INITIAL_STREAK, recordPlay, type StreakState } from "../retention/streak";

/** Lineage edge for the codex lineage view. */
export interface LineageEntry {
  childId: string;
  parentIds: [string, string];
}

interface PersistedState {
  playerId: string;
  playerName: string;
  codex: SerializedSpecimen[];
  flavors: Record<string, string>;
  credits: Record<string, { discoverer: string; isMine: boolean }>;
  lineage: LineageEntry[];
  squadIds: string[];
  streak: StreakState;
  questProgress: QuestProgress;
  totals: PlayerTotals;
  claimedQuests: string[];
  defeatedBossDates: string[];
}

export interface CraftOutcome {
  specimen: Specimen;
  flavor: string;
  provenance: "llm" | "fallback";
  discovery: DiscoveryRecord;
  alreadyInCodex: boolean;
}

export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

const STATE_KEY = "state";

export class Game {
  readonly store: VersionedStore;
  registry: RegistryClient;
  craftAdapter: CraftAdapter;

  playerId: string;
  playerName: string;
  codex: Specimen[];
  flavors: Record<string, string>;
  credits: Record<string, { discoverer: string; isMine: boolean }>;
  lineage: LineageEntry[];
  squadIds: string[];
  streak: StreakState;
  questProgress: QuestProgress;
  totals: PlayerTotals;
  claimedQuests: string[];
  defeatedBossDates: string[];

  constructor(backend: StorageBackend = defaultBackend()) {
    this.store = new VersionedStore(backend, "alchemy-arena", 1);
    this.registry = new LocalRegistry(backend);
    this.craftAdapter = new DeterministicAdapter();

    const saved = this.store.get<PersistedState>(STATE_KEY);
    this.playerId = saved?.playerId ?? `alchemist-${Math.random().toString(36).slice(2, 10)}`;
    this.playerName = saved?.playerName ?? "Alchemist";
    this.codex = saved?.codex.map(deserializeSpecimen) ?? [...STARTERS];
    this.flavors = saved?.flavors ?? {};
    this.credits = saved?.credits ?? {};
    this.lineage = saved?.lineage ?? [];
    this.squadIds = saved?.squadIds ?? STARTERS.slice(0, 3).map((s) => s.id);
    this.streak = saved?.streak ?? INITIAL_STREAK;
    this.questProgress = saved?.questProgress ?? {};
    this.totals = saved?.totals ?? { crafts: 0, discoveries: 0, wins: 0, bestStreak: 0 };
    this.claimedQuests = saved?.claimedQuests ?? [];
    this.defeatedBossDates = saved?.defeatedBossDates ?? [];
  }

  save(): void {
    const state: PersistedState = {
      playerId: this.playerId,
      playerName: this.playerName,
      codex: this.codex.map(serializeSpecimen),
      flavors: this.flavors,
      credits: this.credits,
      lineage: this.lineage,
      squadIds: this.squadIds,
      streak: this.streak,
      questProgress: this.questProgress,
      totals: this.totals,
      claimedQuests: this.claimedQuests,
      defeatedBossDates: this.defeatedBossDates,
    };
    this.store.set(STATE_KEY, state);
  }

  byId(id: string): Specimen | undefined {
    return this.codex.find((s) => s.id === id);
  }

  squad(): Specimen[] {
    return this.squadIds.map((id) => this.byId(id)).filter((s): s is Specimen => s !== undefined);
  }

  touchDaily(date: string = todayUtc()): void {
    const before = this.streak.streak;
    this.streak = recordPlay(this.streak, date);
    if (this.streak.streak !== before) {
      this.totals = { ...this.totals, bestStreak: this.streak.bestStreak };
      this.save();
    }
  }

  questEvent(event: QuestEvent, date: string = todayUtc()): void {
    const quests = questsForDay(date, this.playerId);
    this.questProgress = updateQuestProgress(quests, this.questProgress, event);
    this.save();
  }

  async craft(parentAId: string, parentBId: string): Promise<CraftOutcome> {
    const a = this.byId(parentAId);
    const b = this.byId(parentBId);
    if (a === undefined || b === undefined) throw new Error("unknown parent specimen");

    const result = await craftElement(a, b, this.craftAdapter);
    const specimen = result.specimen;
    const alreadyInCodex = this.byId(specimen.id) !== undefined;

    const discovery = await this.registry.claimDiscovery(
      hashToHex(specimen.recipeHash),
      this.playerName,
      specimen.name,
    );

    if (!alreadyInCodex) {
      this.codex = [...this.codex, specimen];
      this.flavors[specimen.id] = result.flavor;
      this.lineage = [...this.lineage, { childId: specimen.id, parentIds: [a.id, b.id] }];
    }
    this.credits[specimen.id] = { discoverer: discovery.discoverer, isMine: discovery.isNew };

    this.totals = {
      ...this.totals,
      crafts: this.totals.crafts + 1,
      discoveries: this.totals.discoveries + (discovery.isNew ? 1 : 0),
    };
    this.touchDaily();
    this.questEvent({ metric: "crafts", amount: 1 });
    if (discovery.isNew) this.questEvent({ metric: "new-discoveries", amount: 1 });
    this.save();

    return {
      specimen,
      flavor: result.flavor,
      provenance: result.provenance,
      discovery,
      alreadyInCodex,
    };
  }

  recordBattleResult(won: boolean, wasBoss: boolean, date: string = todayUtc()): void {
    this.totals = { ...this.totals, wins: this.totals.wins + (won ? 1 : 0) };
    this.touchDaily(date);
    this.questEvent({ metric: "battles", amount: 1 }, date);
    if (won) this.questEvent({ metric: "wins", amount: 1 }, date);
    if (wasBoss) {
      this.questEvent({ metric: "boss-attempts", amount: 1 }, date);
      if (won && !this.defeatedBossDates.includes(date)) {
        this.defeatedBossDates = [...this.defeatedBossDates, date];
      }
    }
    this.save();
  }

  setSquad(ids: string[]): void {
    if (ids.length === 3 && new Set(ids).size === 3 && ids.every((id) => this.byId(id))) {
      this.squadIds = [...ids];
      this.save();
    }
  }
}
