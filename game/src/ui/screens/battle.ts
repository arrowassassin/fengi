import { commentate, templateCommentator } from "../../commentary/commentator";
import {
  type Action,
  aiPolicy,
  type BattleConfig,
  type BattleEvent,
  type BattleState,
  createBattle,
  legalActions,
  type Specimen,
  stepTurn,
} from "../../engine";
import { buildShareGrid } from "../../retention/shareGrid";
import type { Game } from "../../state/game";
import { todayUtc } from "../../state/game";
import { renderFighter } from "../components/badge";
import { renderMoveCard } from "../components/moveCard";
import { button, clear, el } from "../dom";

export interface BattleScreenOptions {
  game: Game;
  playerSquad: Specimen[];
  opponentSquad: Specimen[];
  seed: bigint;
  config: BattleConfig;
  wasBoss: boolean;
  opponentLabel: string;
  onExit: () => void;
}

function logLineClass(event: BattleEvent): string {
  if (event.kind === "damage" && event.effectiveness > 1) return "aa-log-line effective";
  if (event.kind === "status-applied" || event.kind === "status-tick") return "aa-log-line status";
  if (event.kind === "faint") return "aa-log-line faint";
  return "aa-log-line";
}

function describe(event: BattleEvent): string | undefined {
  switch (event.kind) {
    case "turn-start":
      return `— turn ${event.turn} —`;
    case "switch":
      return `▸ ${event.name} takes the field`;
    case "move-used":
      return `${event.name} uses ${event.move}${event.struggle ? " (exhausted)" : ""}`;
    case "move-missed":
      return `…but it misses`;
    case "damage":
      return event.effectiveness === 0
        ? `${event.name} is untouched`
        : `${event.name} takes ${event.amount}${event.crit ? " (crit!)" : ""}${
            event.effectiveness > 1
              ? " — super effective"
              : event.effectiveness < 1
                ? " — resisted"
                : ""
          }`;
    case "recoil":
      return `${event.name} suffers ${event.amount} recoil`;
    case "status-applied":
      return `${event.name} is afflicted: ${event.effect}`;
    case "status-tick":
      return `${event.name} suffers ${event.amount} from ${event.effect}`;
    case "stun-skip":
      return `${event.name} is stunned and cannot act`;
    case "heal":
      return `${event.name} recovers ${event.amount}`;
    case "stage-change":
      return `${event.name}'s ${event.stat} ${event.delta > 0 ? "rises" : "falls"}`;
    case "faint":
      return `${event.name} faints`;
    case "battle-end":
      return event.outcome === "draw" ? "The battle ends in a draw" : "The battle is over";
    default:
      return undefined;
  }
}

export function renderBattleScreen(options: BattleScreenOptions): HTMLElement {
  const root = el("section", { className: "aa-battle" });
  const state: BattleState = createBattle(
    [options.playerSquad, options.opponentSquad],
    options.seed,
    options.config,
  );
  let logCursor = 0;
  let resultRecorded = false;

  const header = el("div", { className: "aa-broadcast" });
  header.append(
    el("span", {}, [el("span", { className: "aa-live-dot" }), `LIVE · ${options.opponentLabel}`]),
    el("span", { className: "aa-turn-counter", text: "TURN 01" }),
  );
  const field = el("div", { className: "aa-battle-field" });
  const actions = el("div", { className: "aa-actions" });
  const logPane = el("div", { className: "aa-battle-log" });
  logPane.setAttribute("aria-live", "polite");
  const footer = el("div", {});
  root.append(header, field, actions, logPane, footer);

  function appendNewLogLines(): void {
    for (; logCursor < state.log.length; logCursor++) {
      const event = state.log[logCursor];
      if (event === undefined) continue;
      const text = describe(event);
      if (text !== undefined) {
        logPane.append(el("div", { className: logLineClass(event), text }));
      }
      const commentary = commentate(templateCommentator, event);
      if (commentary !== undefined) {
        logPane.append(el("div", { className: "aa-log-commentary", text: commentary }));
      }
    }
    logPane.scrollTop = logPane.scrollHeight;
  }

  function sideView(side: 0 | 1): HTMLElement {
    const s = state.sides[side];
    const active = s.squad[s.activeIndex];
    const box = el("div", {});
    if (active === undefined) return box;
    // Fighter: badge inside the segmented HP ring; player = lime, foe = cyan.
    box.append(
      renderFighter(active.specimen, {
        size: side === 0 ? 205 : 185,
        side: side === 0 ? "player" : "opponent",
        hpPct: active.currentHp / active.maxHp,
        idle: side === 0 && active.currentHp > 0 && state.outcome === undefined,
      }),
      el("div", { className: "aa-tape", text: active.specimen.name }),
      el(
        "div",
        { className: "aa-chip-row" },
        active.specimen.types.map((t) =>
          el("span", { className: `aa-chip aa-chip-${t.archetype}`, text: t.label }),
        ),
      ),
    );
    // Bench minis (handoff 1b switch row): 56px fighters with mini rings —
    // element art is always the procedural badge, never platform emoji.
    const strip = el("div", { className: "aa-streak-row" });
    for (const [i, c] of s.squad.entries()) {
      if (i === s.activeIndex) continue;
      const mini = renderFighter(c.specimen, {
        size: 56,
        side: side === 0 ? "player" : "opponent",
        hpPct: c.currentHp / c.maxHp,
      });
      mini.title = c.specimen.name;
      strip.append(mini);
    }
    box.append(strip);
    return box;
  }

  function finish(): void {
    if (state.outcome === undefined || resultRecorded) return;
    resultRecorded = true;
    const won = state.outcome === "side0";
    options.game.recordBattleResult(won, options.wasBoss);

    const verdict = el("div", {
      className: `aa-card aa-verdict ${won ? "victory" : state.outcome === "draw" ? "" : "defeat"}`,
    });
    verdict.append(
      el("h2", { text: won ? "Victory" : state.outcome === "draw" ? "Draw" : "Defeat" }),
      el("p", {
        className: "aa-mono aa-muted",
        text: `${options.opponentLabel} · ${state.turn} turns`,
      }),
    );
    // Squad row with final ring states (handoff 1c).
    const squadRow = el("div", { className: "aa-streak-row" }, []);
    squadRow.style.justifyContent = "center";
    for (const c of state.sides[0].squad) {
      squadRow.append(
        renderFighter(c.specimen, {
          size: 92,
          side: "player",
          hpPct: c.currentHp / c.maxHp,
        }),
      );
    }
    verdict.append(squadRow);
    const grid = buildShareGrid({
      outcome: state.outcome,
      turns: state.turn,
      date: todayUtc(),
      playerSquadEmoji: options.playerSquad.map((s) => s.emoji),
      opponentSquadEmoji: options.opponentSquad.map((s) => s.emoji),
      playerRemaining: state.sides[0].squad.filter((c) => c.currentHp > 0).length,
      maskOpponent: options.wasBoss,
      daily: options.wasBoss,
      streakDays: options.game.streak.streak,
      freezesBanked: options.game.streak.freezes,
    });
    const shareBlock = el("div", { className: "aa-share", text: grid });
    const copyButton = button("Copy share grid", () => {
      void navigator.clipboard?.writeText(grid).then(() => {
        copyButton.textContent = "Copied!";
      });
    });
    verdict.append(
      shareBlock,
      el("div", {}, [copyButton, " ", button("Back", options.onExit, "aa-ghost")]),
    );
    footer.append(verdict);
  }

  function renderActions(): void {
    clear(actions);
    if (state.outcome !== undefined) return;
    const me = state.sides[0];
    const active = me.squad[me.activeIndex];
    if (active === undefined) return;

    for (const action of legalActions(state, 0)) {
      if (action.kind === "move") {
        const move = active.specimen.moves[action.moveIndex];
        actions.append(
          renderMoveCard(move, active.movePp[action.moveIndex], () => {
            if (move.category === "status") {
              options.game.questEvent({ metric: "status-moves-used", amount: 1 });
            }
            takeTurn(action);
          }),
        );
      } else if (action.kind === "struggle") {
        actions.append(button("Exhausted Strike", () => takeTurn(action)));
      } else {
        const target = me.squad[action.squadIndex];
        if (target !== undefined) {
          actions.append(
            button(`Switch → ${target.specimen.name}`, () => takeTurn(action), "aa-ghost"),
          );
        }
      }
    }
  }

  function countSuperEffectiveHits(from: number): number {
    let count = 0;
    for (let i = from; i < state.log.length; i++) {
      const event = state.log[i];
      if (
        event !== undefined &&
        event.kind === "damage" &&
        event.side === 1 &&
        event.effectiveness > 1
      ) {
        count++;
      }
    }
    return count;
  }

  function takeTurn(playerAction: Action): void {
    const before = state.log.length;
    const opponentAction = aiPolicy(state, 1);
    stepTurn(state, [playerAction, opponentAction]);
    const superHits = countSuperEffectiveHits(before);
    if (superHits > 0) {
      options.game.questEvent({ metric: "super-effective-hits", amount: superHits });
    }
    rerender();
  }

  function rerender(): void {
    const counter = header.querySelector(".aa-turn-counter");
    if (counter !== null) counter.textContent = `TURN ${String(state.turn + 1).padStart(2, "0")}`;
    clear(field);
    field.append(sideView(0), sideView(1));
    appendNewLogLines();
    renderActions();
    finish();
  }

  rerender();
  return root;
}
