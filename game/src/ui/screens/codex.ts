import { badgeSpecFor, lockedBadgeSvg } from "../../art/badge";
import type { ElementType, Specimen } from "../../engine";
import { ACHIEVEMENTS, earnedAchievements } from "../../retention/achievements";
import type { Game, LineageEntry } from "../../state/game";
import { renderBadge } from "../components/badge";
import { button, clear, el } from "../dom";

const RANKS: [number, string][] = [
  [0, "NOVICE"],
  [12, "ADEPT"],
  [30, "SEER"],
  [60, "ARCHIVIST"],
  [120, "GRAND ALCHEMIST"],
];

function rankFor(count: number): { name: string; next: string; nextAt: number; pct: number } {
  let current: [number, string] = RANKS[0] ?? [0, "NOVICE"];
  let next: [number, string] | undefined;
  for (const rank of RANKS) {
    if (count >= rank[0]) current = rank;
    else {
      next = rank;
      break;
    }
  }
  const floor = current[0];
  const ceil = next?.[0] ?? floor + 1;
  return {
    name: current[1],
    next: next?.[1] ?? "—",
    nextAt: ceil,
    pct: next === undefined ? 1 : (count - floor) / (ceil - floor),
  };
}

/** Codex (handoff 1d/1e): sticker book, rank meter, filters, lineage overlay. */
export function renderCodexScreen(game: Game, onSquadChange: () => void): HTMLElement {
  const root = el("section", {});

  const firsts = Object.values(game.credits).filter((c) => c.isMine).length;
  const rank = rankFor(game.codex.length);

  const head = el("div", {});
  head.append(
    el("h2", { text: "Codex" }),
    el("span", {
      className: "aa-tape",
      text: `${rank.name} — ${game.codex.length}/∞ · ${firsts} FIRSTS`,
    }),
  );
  const meter = el("div", { className: "aa-meter" });
  const lit = Math.round(rank.pct * 12);
  for (let i = 0; i < 12; i++) {
    meter.append(el("span", { className: `aa-meter-cell${i < lit ? " lit" : ""}` }));
  }
  head.append(
    meter,
    el("div", { className: "aa-mono aa-muted", text: `NEXT RANK: ${rank.next} @ ${rank.nextAt}` }),
  );
  root.append(head);

  root.append(
    el("p", { className: "aa-muted", text: "Click three stickers to form your battle squad." }),
  );

  // ---------- Search + filter chips ----------
  let query = "";
  let filter: "all" | "foil" | ElementType = "all";
  const search = document.createElement("input");
  search.className = "aa-search";
  search.placeholder = "FIND A STICKER…";
  search.addEventListener("input", () => {
    query = search.value;
    renderGrid();
  });
  root.append(search);

  const filterRow = el("div", { className: "aa-filter-row" });
  root.append(filterRow);

  function renderFilters(): void {
    clear(filterRow);
    const archetypesInCodex = [...new Set(game.codex.map((s) => s.types[0].archetype))];
    const options: ("all" | "foil" | ElementType)[] = ["all", ...archetypesInCodex, "foil"];
    for (const option of options) {
      const chip = button(
        option === "all" ? "ALL" : option === "foil" ? "FOIL ◆" : option.toUpperCase(),
        () => {
          filter = option;
          renderFilters();
          renderGrid();
        },
        `aa-filter${filter === option ? " active" : ""}${option === "foil" ? " foil" : ""}`,
      );
      filterRow.append(chip);
    }
  }

  let pending: string[] = [...game.squadIds];
  const grid = el("div", { className: "aa-codex" });
  root.append(grid);

  function matches(specimen: Specimen): boolean {
    if (query !== "" && !specimen.name.toUpperCase().includes(query.trim().toUpperCase())) {
      return false;
    }
    if (filter === "all") return true;
    if (filter === "foil") return badgeSpecFor(specimen).foil;
    return specimen.types.some((t) => t.archetype === filter);
  }

  function renderGrid(): void {
    clear(grid);
    for (const specimen of game.codex) {
      if (!matches(specimen)) continue;
      const cell = el("div", { className: "aa-codex-cell" });
      if (badgeSpecFor(specimen).foil) {
        cell.append(el("span", { className: "aa-foil-tab", text: "FOIL" }));
      }
      cell.append(
        renderBadge(specimen, {
          size: 88,
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
            text: credit.isMine ? "YOUR DISCOVERY" : `FIRST: ${credit.discoverer.toUpperCase()}`,
          }),
        );
      }
      if (game.lineage.some((entry) => entry.childId === specimen.id)) {
        cell.append(button("LINEAGE", () => openLineage(specimen), "aa-filter"));
      }
      grid.append(cell);
    }
    // Undiscovered teaser cells (handoff: dashed ? stickers named ???).
    for (let i = 0; i < 2; i++) {
      const cell = el("div", { className: "aa-codex-cell" });
      const art = el("div", {});
      art.style.width = "88px";
      art.style.height = "88px";
      art.innerHTML = lockedBadgeSvg();
      cell.append(art, el("div", { className: "aa-mono aa-muted", text: "???" }));
      grid.append(cell);
    }
  }

  // ---------- Lineage overlay (handoff 1e) ----------
  function lineageOf(id: string): LineageEntry | undefined {
    return game.lineage.find((entry) => entry.childId === id);
  }

  /**
   * Duplicate ancestors repeat their badge (handoff 1e), so a deep chain of
   * fusions-of-fusions grows the full tree exponentially (Fibonacci-style).
   * A shared node budget keeps the overlay bounded: shallow trees render in
   * full, and anything beyond the budget collapses to a ⋯ marker.
   */
  const LINEAGE_NODE_BUDGET = 120;

  function renderLineageNode(id: string, depth: number, budget: { left: number }): HTMLElement {
    const node = el("div", { className: "aa-lineage-node" });
    if (budget.left <= 0) {
      const mark = el("div", { className: "aa-mono aa-muted", text: "⋯" });
      mark.title = "Deeper lineage truncated";
      node.append(mark);
      return node;
    }
    budget.left -= 1;
    const specimen = game.byId(id);
    if (specimen === undefined) {
      node.append(el("div", { className: "aa-mono aa-muted", text: "???" }));
      return node;
    }
    node.append(renderBadge(specimen, { size: Math.max(56, 88 - depth * 12), showName: true }));
    const parents = lineageOf(id);
    if (parents === undefined) {
      node.append(el("div", { className: "aa-primitive-mark", text: "◦ PRIMITIVE" }));
      return node;
    }
    node.append(el("div", { className: "aa-lineage-elbow" }));
    const generationRow = el("div", { className: "aa-lineage-gen" });
    generationRow.style.opacity = String(Math.max(0.55, 0.85 - depth * 0.1));
    for (const parentId of parents.parentIds) {
      generationRow.append(renderLineageNode(parentId, depth + 1, budget));
    }
    node.append(generationRow);
    return node;
  }

  function openLineage(specimen: Specimen): void {
    const overlay = el("div", { className: "aa-overlay" });
    overlay.append(
      el("span", { className: "aa-tape", text: `LINEAGE · ${specimen.name.toUpperCase()}` }),
      button("✕", () => overlay.remove(), "aa-ghost aa-overlay-close"),
      renderLineageNode(specimen.id, 0, { left: LINEAGE_NODE_BUDGET }),
      el("div", {}, [
        el("span", { className: "aa-tape", text: "◦ = PRIMITIVE" }),
        " ",
        el("span", {
          className: "aa-tape",
          text: "EVERYTHING TRACES BACK TO FIRE · WATER · EARTH · AIR",
        }),
      ]),
    );
    document.body.append(overlay);
  }

  // ---------- Advancements strip (handoff 1d) ----------
  const advance = el("div", { className: "aa-card" });
  const earned = new Set(earnedAchievements(game.totals));
  advance.append(
    el("span", { className: "aa-tape", text: "ADVANCEMENTS" }),
    el("div", {
      className: "aa-mono aa-muted",
      text: `${earned.size}/${ACHIEVEMENTS.length}${
        earned.size < ACHIEVEMENTS.length
          ? ` · NEXT: "${ACHIEVEMENTS.find((a) => !earned.has(a.id))?.name.toUpperCase() ?? ""}"`
          : ""
      }`,
    }),
  );
  const advanceRow = el("div", { className: "aa-advance-row" });
  ACHIEVEMENTS.forEach((achievement, i) => {
    if (i > 0) {
      advanceRow.append(
        el("span", { className: `aa-advance-link${earned.has(achievement.id) ? " lit" : ""}` }),
      );
    }
    advanceRow.append(
      el("span", {
        className: `aa-advance-node${earned.has(achievement.id) ? " unlocked" : ""}`,
        text: achievement.emoji,
        title: `${achievement.name} (${achievement.threshold} ${achievement.metric})`,
      }),
    );
  });
  advance.append(advanceRow);
  root.append(advance);

  root.append(
    button(
      "RESET SQUAD TO PRIMORDIALS",
      () => {
        pending = game.codex.slice(0, 3).map((s) => s.id);
        game.setSquad(pending);
        onSquadChange();
        renderGrid();
      },
      "aa-ghost",
    ),
  );

  renderFilters();
  renderGrid();
  return root;
}
