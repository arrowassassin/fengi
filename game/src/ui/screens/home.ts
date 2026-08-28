import { battleSeed } from "../../engine";
import { ACHIEVEMENTS, earnedAchievements } from "../../retention/achievements";
import { dailyBossSeed, dailyBossSquad } from "../../retention/dailyBoss";
import { isQuestComplete, questsForDay } from "../../retention/quests";
import { dayNumber } from "../../retention/streak";
import { weeklyModifierFor } from "../../retention/weeklyModifier";
import type { Game } from "../../state/game";
import { todayUtc } from "../../state/game";
import { renderBadge } from "../components/badge";
import { button, el } from "../dom";
import type { BattleScreenOptions } from "./battle";

export type StartBattle = (options: Omit<BattleScreenOptions, "game" | "onExit">) => void;

/** Home / daily screen: boss poster, streak seals, quests, weekly banner. */
export function renderHomeScreen(game: Game, startBattle: StartBattle): HTMLElement {
  const root = el("section", {});
  const date = todayUtc();
  game.touchDaily(date);

  root.append(el("h1", { text: "Alchemy Arena" }));

  const modifier = weeklyModifierFor(new Date());
  const banner = el("div", { className: "aa-banner" });
  banner.append(el("strong", { text: `${modifier.name}: ` }), modifier.description);
  root.append(banner);

  // ---------- Streak wax seals (last 7 days) ----------
  const streakCard = el("div", { className: "aa-card" });
  streakCard.append(
    el("h3", { text: `Streak · ${game.streak.streak} day${game.streak.streak === 1 ? "" : "s"}` }),
  );
  const row = el("div", { className: "aa-streak-row" });
  const today = dayNumber(date);
  for (let offset = 6; offset >= 0; offset--) {
    const day = new Date((today - offset) * 86_400_000).toISOString().slice(0, 10);
    const played =
      game.streak.lastPlayed !== null &&
      game.streak.streak > 0 &&
      dayNumber(game.streak.lastPlayed) - dayNumber(day) >= 0 &&
      dayNumber(game.streak.lastPlayed) - dayNumber(day) < game.streak.streak;
    const frozen = game.streak.freezeSpentDates.includes(day);
    const cls = `aa-wax${frozen ? " freeze" : played ? " filled" : ""}${offset === 0 ? " today" : ""}`;
    row.append(el("span", { className: cls, text: day.slice(8), title: day }));
  }
  streakCard.append(
    row,
    el("p", { className: "aa-muted", text: `Freezes banked: ${game.streak.freezes}/2` }),
  );

  // ---------- Daily quests ----------
  const questCard = el("div", { className: "aa-card" });
  questCard.append(el("h3", { text: "Daily quests" }));
  for (const quest of questsForDay(date, game.playerId)) {
    const progress = game.questProgress[quest.id] ?? 0;
    const complete = isQuestComplete(quest, game.questProgress);
    const ribbon = el("div", { className: `aa-quest${complete ? " complete" : ""}` });
    ribbon.append(
      el("span", {}, [
        el("span", { className: "aa-glyph", text: quest.reward }),
        ` ${quest.description}`,
      ]),
      el("span", { className: "aa-mono", text: `${progress}/${quest.target}` }),
    );
    questCard.append(ribbon);
  }

  // ---------- Achievements ----------
  const achievementCard = el("div", { className: "aa-card" });
  achievementCard.append(el("h3", { text: "Achievements" }));
  const earned = new Set(earnedAchievements(game.totals));
  const achievementRow = el("div", { className: "aa-streak-row" });
  for (const a of ACHIEVEMENTS) {
    achievementRow.append(
      el("span", {
        className: `aa-wax aa-glyph${earned.has(a.id) ? " filled" : ""}`,
        text: a.emoji,
        title: `${a.name} (${a.threshold} ${a.metric})`,
      }),
    );
  }
  achievementCard.append(achievementRow);

  const grid = el("div", { className: "aa-grid-2" }, [streakCard, questCard]);
  root.append(grid);

  // ---------- Daily boss poster ----------
  const bossCard = el("div", { className: "aa-card" });
  bossCard.append(el("h2", { text: `Daily boss · ${date}` }));
  const defeated = game.defeatedBossDates.includes(date);
  if (defeated) bossCard.append(el("p", { text: "Defeated. The arena rests until tomorrow." }));
  const bossRow = el("div", { className: "aa-streak-row" });
  bossCard.append(bossRow);
  void dailyBossSquad(date).then((squad) => {
    for (const boss of squad) bossRow.append(renderBadge(boss, { size: 96 }));
    bossCard.append(
      button(defeated ? "Rematch" : "Challenge the boss", () => {
        game.questEvent({ metric: "boss-attempts", amount: 1 });
        startBattle({
          playerSquad: game.squad(),
          opponentSquad: squad,
          seed: dailyBossSeed(date, game.playerId),
          config: weeklyModifierFor(new Date()).config,
          wasBoss: true,
          opponentLabel: `Daily Boss ${date}`,
        });
      }),
    );
  });
  root.append(
    bossCard,
    el("div", { className: "aa-card" }, [
      el("h3", { text: "Skirmish" }),
      el("p", {
        className: "aa-muted",
        text: "A practice bout against a mirror of the primordials.",
      }),
      button("Fight a skirmish", () => {
        const foes = [...game.codex].slice(0, 3);
        startBattle({
          playerSquad: game.squad(),
          opponentSquad: foes,
          seed: battleSeed("skirmish", date, game.playerId, String(game.totals.wins)),
          config: weeklyModifierFor(new Date()).config,
          wasBoss: false,
          opponentLabel: "Skirmish",
        });
      }),
    ]),
  );

  root.append(achievementCard);

  // ---------- Oracle settings ----------
  const settings = el("div", { className: "aa-card" });
  settings.append(el("h3", { text: "Fusion oracle" }));
  const progress = el("p", { className: "aa-muted aa-mono", text: "" });
  const toggle = el("label", {}, [
    (() => {
      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = game.onDeviceOracle;
      box.addEventListener("change", () => {
        game.setOnDeviceOracle(box.checked, (text) => {
          progress.textContent = text;
        });
        progress.textContent = box.checked
          ? "On-device oracle armed — the model downloads on your first fuse."
          : "";
      });
      return box;
    })(),
    " Use the on-device oracle (WebLLM, ~1B model download on first fuse)",
  ]);
  settings.append(
    toggle,
    el("p", {
      className: "aa-muted",
      text: "Off: the seeded workbench generator invents fusions. Either way, crafting never fails.",
    }),
    progress,
  );
  root.append(settings);

  return root;
}
