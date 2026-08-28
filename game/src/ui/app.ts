import "./styles.css";
import type { Game } from "../state/game";
import { Game as GameImpl } from "../state/game";
import { button, clear, el } from "./dom";
import { type BattleScreenOptions, renderBattleScreen } from "./screens/battle";
import { renderCodexScreen } from "./screens/codex";
import { renderHomeScreen } from "./screens/home";
import { renderWorkbenchScreen } from "./screens/workbench";

type ScreenName = "home" | "workbench" | "codex";

export function mountApp(root: HTMLElement, game: Game = new GameImpl()): void {
  const nav = el("nav", { className: "aa-nav" });
  const outlet = el("main", {});
  clear(root);
  root.append(nav, outlet);

  let current: ScreenName = "home";
  const navButtons = new Map<ScreenName, HTMLButtonElement>();

  function show(name: ScreenName): void {
    current = name;
    for (const [key, b] of navButtons) b.classList.toggle("active", key === current);
    clear(outlet);
    switch (name) {
      case "home":
        outlet.append(renderHomeScreen(game, startBattle));
        break;
      case "workbench":
        outlet.append(renderWorkbenchScreen(game));
        break;
      case "codex":
        outlet.append(renderCodexScreen(game, () => show("codex")));
        break;
    }
  }

  function startBattle(options: Omit<BattleScreenOptions, "game" | "onExit">): void {
    for (const [, b] of navButtons) b.classList.remove("active");
    clear(outlet);
    outlet.append(
      renderBattleScreen({
        ...options,
        game,
        onExit: () => show("home"),
      }),
    );
  }

  for (const [name, label] of [
    ["home", "🏰 Daily"],
    ["workbench", "⚗️ Workbench"],
    ["codex", "📜 Codex"],
  ] as const) {
    const b = button(label, () => show(name));
    navButtons.set(name, b);
    nav.append(b);
  }

  show("home");
}
