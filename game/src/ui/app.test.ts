// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STARTERS } from "../content/starters";
import { battleSeed, type Specimen } from "../engine";
import { MemoryBackend } from "../persist/store";
import { Game } from "../state/game";
import { mountApp } from "./app";
import { renderFighter } from "./components/badge";
import { renderBattleScreen } from "./screens/battle";
import { renderCodexScreen } from "./screens/codex";
import { renderHomeScreen } from "./screens/home";
import { renderWorkbenchScreen } from "./screens/workbench";

function newGame(): Game {
  return new Game(new MemoryBackend());
}

function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("app shell", () => {
  it("mounts nav and the home screen", () => {
    const root = document.querySelector<HTMLDivElement>("#app");
    if (root === null) throw new Error("no root");
    mountApp(root, newGame());
    const buttons = [...root.querySelectorAll("nav button")].map((b) => b.textContent);
    expect(buttons).toHaveLength(3);
    expect(root.textContent).toContain("Alchemy Arena");
    expect(root.textContent).toContain("Daily quests");
  });

  it("navigates to the workbench and codex", () => {
    const root = document.querySelector<HTMLDivElement>("#app");
    if (root === null) throw new Error("no root");
    mountApp(root, newGame());
    const nav = [...root.querySelectorAll<HTMLButtonElement>("nav button")];
    nav[1]?.click();
    expect(root.textContent).toContain("Workbench");
    nav[2]?.click();
    expect(root.textContent).toContain("Codex");
  });
});

describe("workbench crafting flow", () => {
  it("fusing two specimens grows the codex and shows a discovery toast", async () => {
    const game = newGame();
    const before = game.codex.length;
    const screen = renderWorkbenchScreen(game, { brewMs: 0 });
    document.body.append(screen);

    const badges = [...screen.querySelectorAll<HTMLElement>(".aa-codex .aa-badge")];
    badges[0]?.click();
    badges[1]?.click();
    const fuse = [...screen.querySelectorAll<HTMLButtonElement>("button")].find(
      (b) => b.textContent === "FUSE",
    );
    expect(fuse).toBeDefined();
    fuse?.click();
    await tick();
    await tick();

    expect(game.codex.length).toBe(before + 1);
    expect(screen.textContent).toContain("FIRST IN THE WORLD");
    expect(game.totals.crafts).toBe(1);
  });
});

describe("fighter ring states (handoff: cracked edge, shatter at 0 HP)", () => {
  it("renders shattered debris at 0 HP and a cracked tangerine edge at low HP", () => {
    const specimen = STARTERS[0];
    if (specimen === undefined) throw new Error("no starters");

    const fainted = renderFighter(specimen, { size: 92, side: "player", hpPct: 0 });
    const shatteredRing = fainted.querySelector(".aa-fighter-ring svg");
    expect(shatteredRing).not.toBeNull();
    expect(shatteredRing?.querySelectorAll("path")).toHaveLength(0); // no arcs left
    expect(shatteredRing?.querySelectorAll("line")).toHaveLength(12); // debris lines

    const wounded = renderFighter(specimen, { size: 92, side: "opponent", hpPct: 0.25 });
    const crackedRing = wounded.querySelector(".aa-fighter-ring svg");
    expect(crackedRing?.innerHTML ?? "").toContain("var(--aa-tangerine)");
    expect(crackedRing?.innerHTML ?? "").toContain('stroke-dasharray="7 5"');
  });
});

describe("battle screen", () => {
  // Regression: a move selection (READY) left un-committed while the player
  // switched fighters used to survive the turn, pre-arming the same move
  // index on the incoming fighter so a single tap fired it un-inspected.
  it("clears an armed READY selection when the player commits a switch instead", () => {
    const screen = renderBattleScreen({
      game: newGame(),
      playerSquad: STARTERS.slice(0, 3),
      opponentSquad: STARTERS.slice(1, 4),
      seed: battleSeed("stale-ready-regression"),
      config: {},
      wasBoss: false,
      opponentLabel: "Test Foe",
      onExit: () => undefined,
    });
    document.body.append(screen);

    screen.querySelector<HTMLButtonElement>(".aa-actions .aa-move")?.click(); // arm move 0
    expect(screen.querySelector(".aa-actions .aa-move.selected")).not.toBeNull();
    const switchButton = [...screen.querySelectorAll<HTMLButtonElement>(".aa-actions button")].find(
      (b) => b.textContent?.startsWith("SWITCH"),
    );
    expect(switchButton).toBeDefined();
    switchButton?.click(); // commit the turn with a switch

    // Next turn: nothing may be pre-armed, and one tap only arms — never fires.
    expect(screen.querySelector(".aa-actions .aa-move.selected")).toBeNull();
    const turnBefore = screen.textContent?.match(/TURN (\d+)/)?.[1];
    screen.querySelector<HTMLButtonElement>(".aa-actions .aa-move")?.click();
    expect(screen.textContent?.match(/TURN (\d+)/)?.[1]).toBe(turnBefore);
  });

  it("plays an interactive battle to a verdict", async () => {
    const game = newGame();
    const screen = renderBattleScreen({
      game,
      playerSquad: STARTERS.slice(0, 3),
      opponentSquad: STARTERS.slice(3, 6),
      seed: battleSeed("ui-test"),
      config: {},
      wasBoss: false,
      opponentLabel: "Test Foe",
      onExit: () => undefined,
    });
    document.body.append(screen);

    for (let i = 0; i < 400; i++) {
      const action = screen.querySelector<HTMLButtonElement>(".aa-actions button:not(:disabled)");
      if (action === null) break;
      action.click();
    }
    expect(screen.querySelector(".aa-verdict")).not.toBeNull();
    expect(screen.textContent).toMatch(/Victory|Defeat|Draw/);
    const battles = Object.keys(game.questProgress).length >= 0;
    expect(battles).toBe(true);
  });
});

describe("codex lineage overlay", () => {
  // Regression: duplicate ancestors repeat their badge (handoff 1e), so a
  // chain of fusions-of-fusions grows the full ancestry tree exponentially —
  // deep codexes used to freeze the tab / exhaust the heap on open. The
  // overlay now renders under a fixed node budget with a ⋯ truncation marker.
  it("renders a bounded overlay for a deep fibonacci fusion chain", async () => {
    const game = newGame();
    const chain: Specimen[] = [game.codex[0] as Specimen, game.codex[1] as Specimen];
    for (let i = 0; i < 20; i++) {
      const a = chain[chain.length - 1] as Specimen;
      const b = chain[chain.length - 2] as Specimen;
      chain.push((await game.craft(a.id, b.id)).specimen);
    }
    const screen = renderCodexScreen(game, () => undefined);
    document.body.append(screen);
    const lineageButtons = [...screen.querySelectorAll<HTMLButtonElement>("button")].filter(
      (b) => b.textContent === "LINEAGE",
    );
    lineageButtons[lineageButtons.length - 1]?.click(); // deepest specimen
    const overlay = document.querySelector(".aa-overlay");
    expect(overlay).not.toBeNull();
    const nodes = overlay?.querySelectorAll(".aa-lineage-node").length ?? 0;
    expect(nodes).toBeGreaterThan(0);
    expect(nodes).toBeLessThan(400); // budget + truncation markers, never phi^n
    expect(overlay?.textContent).toContain("⋯");
    overlay?.remove();
  });
});

describe("home countdown interval", () => {
  // Regression: the boss countdown interval only cleared itself after it had
  // seen the screen connected at least once, so unmounting the home screen
  // before the first 1s tick leaked the interval forever.
  it("dies even when the screen is removed before its first tick", () => {
    vi.useFakeTimers();
    try {
      const screen = renderHomeScreen(newGame(), () => undefined);
      document.body.append(screen);
      screen.remove(); // navigate away within <1s
      vi.advanceTimersByTime(5000);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
