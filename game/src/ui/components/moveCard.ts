import type { Move } from "../../engine";
import { el } from "../dom";

/** Move card: name, type chip, category, power/accuracy/PP in mono. */
export function renderMoveCard(
  move: Move,
  ppLeft: number,
  onPick: (() => void) | undefined,
): HTMLButtonElement {
  const card = el("button", { className: "aa-move" });
  card.type = "button";
  card.disabled = ppLeft <= 0 || onPick === undefined;
  card.append(
    el("span", { className: "aa-move-name", text: move.name }),
    el("span", {}, [
      el("span", { className: "aa-chip", text: move.type }),
      " ",
      el("span", { className: "aa-chip", text: move.category }),
    ]),
    el("span", {
      className: "aa-move-stats",
      text: `pow ${move.power} · acc ${move.accuracy} · pp ${ppLeft}/${move.pp}${
        move.effect === "none" ? "" : ` · ${move.effect} ${move.effectChance}%`
      }`,
    }),
  );
  if (onPick !== undefined) card.addEventListener("click", onPick);
  return card;
}
