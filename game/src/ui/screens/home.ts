import { archetypesOf, battleSeed, effectiveness, TYPES } from "../../engine";
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

function countdownText(now: Date): string {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const ms = Math.max(0, next - now.getTime());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Home / daily screen (handoff 1f): boss hijack, streak stickers, quests. */
export function renderHomeScreen(game: Game, startBattle: StartBattle): HTMLElement {
  const root = el("section", {});
  const date = todayUtc();
  game.touchDaily(date);

  root.append(el("h1", { text: "Alchemy Arena" }));

  const modifier = weeklyModifierFor(new Date());
  const banner = el("div", { className: "aa-banner" });
  banner.append(el("strong", { text: `${modifier.name}: ` }), modifier.description);
  root.append(banner);

  // ---------- Daily boss poster (1f) ----------
  const bossCard = el("div", { className: "aa-card aa-scanlines" });
  bossCard.append(
    el("div", { className: "aa-hijack", text: "▓▓░ SIGNAL HIJACK / EVERYONE FIGHTS" }),
  );
  bossCard.append(el("div", { className: "aa-mono", text: "TODAY'S WORLDWIDE BOSS" }));
  const bossTitle = el("div", { className: "aa-boss-title", text: "…" });
  const bossRow = el("div", { className: "aa-streak-row aa-glitch" });
  const bossHint = el("div", { className: "aa-mono aa-muted" });
  const countdown = el("div", { className: "aa-countdown" });
  bossCard.append(bossTitle, bossRow, bossHint, countdown);
  const defeated = game.defeatedBossDates.includes(date);
  if (defeated) {
    bossCard.append(
      el("p", { className: "aa-mono", text: "BEATEN · THE ARENA RESTS UNTIL TOMORROW" }),
    );
  }

  countdown.textContent = `NEXT BOSS ${countdownText(new Date())}`;
  // The screen is appended synchronously after render, so any tick that finds
  // the node disconnected means it was unmounted — stop, or the interval
  // leaks forever (e.g. navigating away before the first tick).
  const timer = setInterval(() => {
    if (!countdown.isConnected) {
      clearInterval(timer);
      return;
    }
    countdown.textContent = `NEXT BOSS ${countdownText(new Date())}`;
  }, 1000);

  void dailyBossSquad(date).then((squad) => {
    const lead = squad[0];
    if (lead !== undefined) bossTitle.textContent = lead.name;
    for (const boss of squad) bossRow.append(renderBadge(boss, { size: 96 }));
    // Weakness hint (1f): what hits the boss's archetypes hardest.
    const bossArchetypes = squad.flatMap((s) => archetypesOf(s));
    const best = [...TYPES]
      .map((atk) => ({
        atk,
        score: bossArchetypes.reduce((sum, def) => sum + effectiveness(atk, [def]), 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((x) => x.atk.toUpperCase());
    bossHint.textContent = `WEAK TO ${best.join(" + ")}`;
    bossCard.append(
      button(defeated ? "REMATCH" : "ENTER THE BROADCAST →", () => {
        game.questEvent({ metric: "boss-attempts", amount: 1 });
        startBattle({
          playerSquad: game.squad(),
          opponentSquad: squad,
          seed: dailyBossSeed(date, game.playerId),
          config: weeklyModifierFor(new Date()).config,
          wasBoss: true,
          opponentLabel: `Boss · ${lead?.name ?? date}`,
        });
      }),
    );
  });
  root.append(bossCard);

  // ---------- Streak sticker chips ----------
  const streakCard = el("div", { className: "aa-card" });
  streakCard.append(el("h3", { text: `Streak ${game.streak.streak}` }));
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
    const glyph = offset === 0 ? "▶" : frozen ? "❄" : played ? "✔" : day.slice(8);
    row.append(el("span", { className: cls, text: glyph, title: day }));
  }
  streakCard.append(
    row,
    el("p", { className: "aa-mono aa-muted", text: `FREEZES BANKED ${game.streak.freezes}/2` }),
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
  root.append(el("div", { className: "aa-grid-2" }, [streakCard, questCard]));

  // ---------- Skirmish ----------
  root.append(
    el("div", { className: "aa-card" }, [
      el("h3", { text: "Skirmish" }),
      el("p", { className: "aa-muted", text: "An unranked bout against a mirror squad." }),
      button("FIGHT A SKIRMISH", () => {
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

  // ---------- Achievements ----------
  const achievementCard = el("div", { className: "aa-card" });
  achievementCard.append(el("h3", { text: "Achievements" }));
  const earned = new Set(earnedAchievements(game.totals));
  const achievementRow = el("div", { className: "aa-advance-row" });
  ACHIEVEMENTS.forEach((a, i) => {
    if (i > 0) {
      achievementRow.append(
        el("span", { className: `aa-advance-link${earned.has(a.id) ? " lit" : ""}` }),
      );
    }
    achievementRow.append(
      el("span", {
        className: `aa-advance-node${earned.has(a.id) ? " unlocked" : ""}`,
        text: a.emoji,
        title: `${a.name} (${a.threshold} ${a.metric})`,
      }),
    );
  });
  achievementCard.append(achievementRow);
  root.append(achievementCard);

  // ---------- Fusion oracle (1g: neon sign while the model caches) ----------
  const settings = el("div", { className: "aa-card" });
  settings.append(el("h3", { text: "Fusion oracle" }));
  const neon = el("div", { className: "aa-neon" });
  const progressLine = el("p", { className: "aa-mono aa-muted", text: "" });

  function renderNeon(fraction: number): void {
    neon.replaceChildren();
    const word = "ALCHEMY ARENA";
    const litCount = Math.round(fraction * word.length);
    for (let i = 0; i < word.length; i++) {
      const span = el("span", { text: word[i] ?? "" });
      span.className = i < litCount ? "lit" : "unlit";
      if (i === litCount && fraction > 0 && fraction < 1) span.classList.add("lit", "edge");
      neon.append(span);
    }
  }

  const box = document.createElement("input");
  box.type = "checkbox";
  box.checked = game.onDeviceOracle;
  box.addEventListener("change", () => {
    game.setOnDeviceOracle(box.checked, (text) => {
      progressLine.textContent = text.toUpperCase();
      const match = /(\d+)%|\[(\d+)\/(\d+)\]/.exec(text);
      if (match !== null) {
        const pct =
          match[1] !== undefined
            ? Number(match[1]) / 100
            : Number(match[2] ?? 0) / Math.max(1, Number(match[3] ?? 1));
        renderNeon(Math.max(0, Math.min(1, pct)));
      }
    });
    if (box.checked) {
      renderNeon(0.05);
      progressLine.textContent = "WARMING UP THE LAB — THE MODEL STREAMS IN ON YOUR FIRST FUSE";
    } else {
      renderNeon(0);
      progressLine.textContent = "";
    }
  });
  const toggle = el("label", {}, [
    box,
    " USE THE ON-DEVICE ORACLE (WEBLLM · ~600MB ON FIRST FUSE)",
  ]);
  settings.append(
    toggle,
    neon,
    el("p", {
      className: "aa-muted",
      text: "Off: the seeded workbench generator invents fusions. Either way, crafting never fails.",
    }),
    progressLine,
  );
  if (game.onDeviceOracle) renderNeon(0.05);
  root.append(settings);

  return root;
}
