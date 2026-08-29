import { badgeSpecFor } from "../../art/badge";
import type { Specimen } from "../../engine";
import { dailyBossSquad } from "../../retention/dailyBoss";
import type { CraftOutcome, Game } from "../../state/game";
import { todayUtc } from "../../state/game";
import { renderBadge } from "../components/badge";
import { button, clear, el } from "../dom";

export interface WorkbenchOptions {
  /** Minimum brewing time (handoff: 900ms pulse); 0 in tests. */
  brewMs?: number;
}

/** Workbench (handoff 1a): quest ribbon, fusion stage, spec plaque, tray. */
export function renderWorkbenchScreen(game: Game, options: WorkbenchOptions = {}): HTMLElement {
  const brewMs = options.brewMs ?? 900;
  const root = el("section", {});

  // ---------- Daily quest ribbon (collapsed) ----------
  const ribbon = el("div", { className: "aa-quest" });
  const bossName = el("strong", { className: "aa-display", text: "THE DAILY BOSS" });
  ribbon.append(
    el("span", {}, [
      el("span", { className: "aa-tape lime", text: "TODAY" }),
      " craft something that beats ",
      bossName,
    ]),
    el("span", { className: "aa-mono", text: "▸" }),
  );
  void dailyBossSquad(todayUtc()).then((squad) => {
    if (squad[0] !== undefined) bossName.textContent = squad[0].name;
  });
  root.append(ribbon);

  root.append(el("h2", { text: "Workbench" }));

  let slotA: Specimen | undefined;
  let slotB: Specimen | undefined;
  let brewing = false;

  const stage = el("div", { className: "aa-bench" });
  const result = el("div", {});
  const trayHead = el("div", {});
  const tray = el("div", { className: "aa-codex" });
  root.append(stage, result, trayHead, tray);

  function renderStage(): void {
    clear(stage);
    const equation = el("div", { className: "aa-stage-equation" });
    for (const [label, specimen] of [
      ["SLOT A", slotA],
      ["SLOT B", slotB],
    ] as const) {
      const slot = el("div", {
        className: `aa-bench-slot${specimen === undefined ? "" : " filled"}`,
      });
      if (specimen === undefined) {
        slot.textContent = label;
      } else {
        slot.append(renderBadge(specimen, { size: 96 }));
      }
      equation.append(slot);
      if (label === "SLOT A") {
        equation.append(el("span", { className: "aa-stage-eq-sign", text: "+" }));
      }
    }
    equation.append(el("span", { className: "aa-stage-eq-sign", text: "=" }));
    stage.append(equation);

    if (brewing) {
      stage.append(
        el("div", { className: "aa-brewing", text: "BREWING… THE AI IS INVENTING SOMETHING" }),
      );
      return;
    }
    const fuse = button("FUSE", () => {
      void doFuse();
    });
    fuse.disabled = slotA === undefined || slotB === undefined || slotA.id === slotB.id;
    stage.append(
      fuse,
      button(
        "CLEAR",
        () => {
          slotA = undefined;
          slotB = undefined;
          renderStage();
          renderTrayCells();
        },
        "aa-ghost",
      ),
    );
  }

  function renderPlaque(outcome: CraftOutcome): HTMLElement {
    const spec = badgeSpecFor(outcome.specimen);
    const plaque = el("div", { className: "aa-plaque" });
    plaque.append(el("span", { className: "aa-tape", text: "SPEC PLAQUE" }));
    plaque.append(el("div", { className: "aa-plaque-name", text: outcome.specimen.name }));
    plaque.append(
      el(
        "div",
        { className: "aa-chip-row" },
        outcome.specimen.types.map((t) =>
          el("span", { className: `aa-chip aa-chip-${t.archetype}`, text: t.label }),
        ),
      ),
    );
    plaque.append(
      el("div", {
        className: "aa-plaque-tier",
        text: `TIER ${spec.tier}${spec.foil ? " · FOIL" : ""}`,
      }),
    );
    for (const move of outcome.specimen.moves) {
      const row = el("div", { className: "aa-plaque-move" });
      row.append(
        el("span", { text: move.name }),
        el("span", { className: "pw", text: move.power > 0 ? String(move.power) : "—" }),
      );
      plaque.append(row);
    }
    plaque.append(el("p", { className: "aa-muted", text: outcome.flavor }));
    plaque.append(
      el("p", {
        className: "aa-credit",
        text: outcome.discovery.isNew
          ? "FIRST IN THE WORLD ▲"
          : `FIRST DISCOVERED BY ${outcome.discovery.discoverer.toUpperCase()}`,
      }),
    );
    return plaque;
  }

  async function doFuse(): Promise<void> {
    if (slotA === undefined || slotB === undefined || brewing) return;
    brewing = true;
    renderStage();
    const started = Date.now();
    const outcome = await game.craft(slotA.id, slotB.id);
    const elapsed = Date.now() - started;
    if (elapsed < brewMs) {
      await new Promise((resolve) => setTimeout(resolve, brewMs - elapsed));
    }
    brewing = false;

    clear(result);
    const card = el("div", { className: "aa-toast" });
    if (outcome.discovery.isNew) {
      card.append(el("div", { className: "aa-discovery-lockup", text: "NEW DISCOVERY!" }));
    }
    card.append(renderBadge(outcome.specimen, { size: 170 }));
    const seconds = Math.max(1, Math.round((Date.now() - started) / 1000));
    card.append(
      el("div", {
        className: "aa-meta-line",
        text: `FUSION 00:00:${String(seconds).padStart(2, "0")}${
          outcome.discovery.isNew ? " · FIRST IN THE WORLD ▲" : ""
        }`,
      }),
    );
    card.append(renderPlaque(outcome));
    if (outcome.provenance === "fallback") {
      card.append(
        el("p", {
          className: "aa-muted",
          text: "The oracle was silent; the workbench improvised.",
        }),
      );
    }
    result.append(card);
    slotA = undefined;
    slotB = undefined;
    renderStage();
    renderTray();
  }

  let filter = "";

  function renderTray(): void {
    clear(trayHead);
    const search = document.createElement("input");
    search.className = "aa-search";
    search.placeholder = "SEARCH THE SHELF…";
    search.value = filter;
    search.addEventListener("input", () => {
      filter = search.value;
      renderTrayCells();
    });
    trayHead.append(
      search,
      el("span", { className: "aa-tape", text: `${game.codex.length} DISCOVERED` }),
    );
    renderTrayCells();
  }

  function renderTrayCells(): void {
    clear(tray);
    const needle = filter.trim().toUpperCase();
    for (const specimen of game.codex) {
      if (needle !== "" && !specimen.name.toUpperCase().includes(needle)) continue;
      const selected = specimen.id === slotA?.id || specimen.id === slotB?.id;
      tray.append(
        renderBadge(specimen, {
          size: 88,
          selected,
          onClick: () => {
            if (brewing) return;
            if (specimen.id === slotA?.id) slotA = undefined;
            else if (specimen.id === slotB?.id) slotB = undefined;
            else if (slotA === undefined) slotA = specimen;
            else if (slotB === undefined) slotB = specimen;
            else {
              // Both full: restart with this one in slot A (handoff behavior).
              slotA = specimen;
              slotB = undefined;
            }
            renderStage();
            renderTrayCells();
          },
        }),
      );
    }
  }

  renderStage();
  renderTray();
  return root;
}
