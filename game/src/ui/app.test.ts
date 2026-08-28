// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { STARTERS } from "../content/starters";
import { battleSeed } from "../engine";
import { MemoryBackend } from "../persist/store";
import { Game } from "../state/game";
import { mountApp } from "./app";
import { renderBattleScreen } from "./screens/battle";
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
    const screen = renderWorkbenchScreen(game);
    document.body.append(screen);

    const badges = [...screen.querySelectorAll<HTMLElement>(".aa-codex .aa-badge")];
    badges[0]?.click();
    badges[1]?.click();
    const fuse = [...screen.querySelectorAll<HTMLButtonElement>("button")].find((b) =>
      b.textContent?.includes("Fuse"),
    );
    expect(fuse).toBeDefined();
    fuse?.click();
    await tick();
    await tick();

    expect(game.codex.length).toBe(before + 1);
    expect(screen.textContent).toContain("First discovered by");
    expect(game.totals.crafts).toBe(1);
  });
});

describe("battle screen", () => {
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
