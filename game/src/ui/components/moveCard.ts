import type { Move } from "../../engine";
import { el } from "../dom";

/** Move card (handoff 1b): display-italic name, lime mono power top-right,
    type sticker chip, dim effect line. */
export function renderMoveCard(
  move: Move,
  ppLeft: number,
  onPick: (() => void) | undefined,
): HTMLButtonElement {
  const card = el("button", { className: "aa-move" });
  card.type = "button";
  card.disabled = ppLeft <= 0 || onPick === undefined;

  const head = el("div", { className: "aa-move-head" });
  head.append(
    el("span", { className: "aa-move-name", text: move.name }),
    el("span", { className: "aa-move-power", text: move.power > 0 ? String(move.power) : "—" }),
  );
  // Chip shows the invented type label (approved design: freeform types);
  // the mechanical archetype only picks the chip color.
  const chip = el("span", { className: `aa-chip aa-chip-${move.type}`, text: move.typeLabel });
  card.append(
    head,
    el("div", {}, [chip, " ", el("span", { className: "aa-chip", text: move.category })]),
    el("span", {
      className: "aa-move-stats",
      text: `acc ${move.accuracy} · pp ${ppLeft}/${move.pp}${
        move.effect === "none" ? "" : ` · ${move.effect} ${move.effectChance}%`
      }`,
    }),
  );
  if (onPick !== undefined) card.addEventListener("click", onPick);
  return card;
}
