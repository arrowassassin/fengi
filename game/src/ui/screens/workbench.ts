import type { Specimen } from "../../engine";
import type { Game } from "../../state/game";
import { renderSeal } from "../components/seal";
import { button, clear, el } from "../dom";

/** Workbench: two bench slots, fuse, reveal, first-discovery toast. */
export function renderWorkbenchScreen(game: Game): HTMLElement {
  const root = el("section", {});
  root.append(el("h2", { text: "Workbench" }));

  let slotA: Specimen | undefined;
  let slotB: Specimen | undefined;
  let busy = false;

  const bench = el("div", { className: "aa-bench" });
  const result = el("div", {});
  const codexGrid = el("div", { className: "aa-codex" });
  root.append(bench, result, el("h3", { text: "Pick two specimens" }), codexGrid);

  function renderBench(): void {
    clear(bench);
    for (const [label, specimen] of [
      ["Slot A", slotA],
      ["Slot B", slotB],
    ] as const) {
      const slot = el("div", {
        className: `aa-bench-slot${specimen === undefined ? "" : " filled"}`,
      });
      if (specimen === undefined) {
        slot.textContent = label;
      } else {
        slot.append(renderSeal(specimen, { size: 96 }));
      }
      bench.append(slot);
    }
    const fuse = button(busy ? "Fusing…" : "⚗️ Fuse", () => {
      void doFuse();
    });
    fuse.disabled = busy || slotA === undefined || slotB === undefined || slotA.id === slotB.id;
    bench.append(
      fuse,
      button(
        "Clear",
        () => {
          slotA = undefined;
          slotB = undefined;
          renderBench();
          renderCodex();
        },
        "aa-ghost",
      ),
    );
  }

  async function doFuse(): Promise<void> {
    if (slotA === undefined || slotB === undefined || busy) return;
    busy = true;
    renderBench();
    const outcome = await game.craft(slotA.id, slotB.id);
    busy = false;
    clear(result);
    const card = el("div", { className: "aa-toast" });
    card.append(
      renderSeal(outcome.specimen, { size: 128 }),
      el("p", { text: outcome.flavor }),
      el("p", {
        className: "aa-credit",
        text: outcome.discovery.isNew
          ? `🥇 First discovered by you, ${outcome.discovery.discoverer}!`
          : `First discovered by ${outcome.discovery.discoverer}`,
      }),
    );
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
    renderBench();
    renderCodex();
  }

  function renderCodex(): void {
    clear(codexGrid);
    for (const specimen of game.codex) {
      const selected = specimen.id === slotA?.id || specimen.id === slotB?.id;
      codexGrid.append(
        renderSeal(specimen, {
          size: 88,
          selected,
          onClick: () => {
            if (specimen.id === slotA?.id) slotA = undefined;
            else if (specimen.id === slotB?.id) slotB = undefined;
            else if (slotA === undefined) slotA = specimen;
            else if (slotB === undefined) slotB = specimen;
            renderBench();
            renderCodex();
          },
        }),
      );
    }
  }

  renderBench();
  renderCodex();
  return root;
}
