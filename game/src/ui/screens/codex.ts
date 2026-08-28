import type { Game } from "../../state/game";
import { renderSeal } from "../components/seal";
import { button, el } from "../dom";

/** Codex: discovered specimens grid, credits, squad picker, lineage. */
export function renderCodexScreen(game: Game, onSquadChange: () => void): HTMLElement {
  const root = el("section", {});
  root.append(el("h2", { text: `Codex · ${game.codex.length} specimens` }));
  root.append(
    el("p", {
      className: "aa-muted",
      text: "Click three specimens to form your battle squad.",
    }),
  );

  let pending: string[] = [...game.squadIds];
  const grid = el("div", { className: "aa-codex" });
  root.append(grid);

  function renderGrid(): void {
    grid.replaceChildren();
    for (const specimen of game.codex) {
      const cell = el("div", {});
      cell.append(
        renderSeal(specimen, {
          size: 96,
          selected: pending.includes(specimen.id),
          onClick: () => {
            pending = pending.includes(specimen.id)
              ? pending.filter((id) => id !== specimen.id)
              : [...pending, specimen.id].slice(-3);
            if (pending.length === 3) {
              game.setSquad(pending);
              onSquadChange();
            }
            renderGrid();
          },
        }),
      );
      const credit = game.credits[specimen.id];
      if (credit !== undefined) {
        cell.append(
          el("div", {
            className: "aa-credit",
            text: credit.isMine ? "🥇 your discovery" : `first: ${credit.discoverer}`,
          }),
        );
      }
      const flavor = game.flavors[specimen.id];
      if (flavor !== undefined) {
        cell.append(el("div", { className: "aa-muted", text: flavor }));
      }
      grid.append(cell);
    }
  }

  // ---------- Lineage ----------
  const lineageCard = el("div", { className: "aa-card" });
  lineageCard.append(el("h3", { text: "Lineage" }));
  if (game.lineage.length === 0) {
    lineageCard.append(el("p", { className: "aa-muted", text: "No fusions recorded yet." }));
  }
  for (const entry of game.lineage) {
    const child = game.byId(entry.childId);
    const parentA = game.byId(entry.parentIds[0]);
    const parentB = game.byId(entry.parentIds[1]);
    if (child === undefined) continue;
    lineageCard.append(
      el("div", {
        className: "aa-mono aa-muted",
        text: `${parentA?.emoji ?? "?"} ${parentA?.name ?? "?"} ✕ ${parentB?.emoji ?? "?"} ${
          parentB?.name ?? "?"
        } → ${child.emoji} ${child.name}`,
      }),
    );
  }
  root.append(lineageCard);

  root.append(
    button(
      "Reset squad to primordials",
      () => {
        pending = game.codex.slice(0, 3).map((s) => s.id);
        game.setSquad(pending);
        onSquadChange();
        renderGrid();
      },
      "aa-ghost",
    ),
  );

  renderGrid();
  return root;
}
