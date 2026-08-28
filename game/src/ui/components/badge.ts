import { badgeSpecFor, badgeSvg, ringSvg } from "../../art/badge";
import type { Specimen } from "../../engine";
import { el } from "../dom";

let instanceCounter = 0;

export interface BadgeOptions {
  size?: number;
  selected?: boolean;
  fainted?: boolean;
  showName?: boolean;
  onClick?: () => void;
}

/** Holo-decal badge card: procedural SVG + tape name + sticker chips. */
export function renderBadge(specimen: Specimen, options: BadgeOptions = {}): HTMLElement {
  const size = options.size ?? 96;
  const root = el("div", {
    className: `aa-badge${options.selected === true ? " selected" : ""}${
      options.fainted === true ? " fainted" : ""
    }`,
  });
  root.setAttribute("role", "img");
  root.setAttribute(
    "aria-label",
    `${specimen.name}, ${specimen.types.map((t) => t.label).join(" and ")} element`,
  );

  const art = el("div", { className: "aa-badge-art" });
  art.style.width = `${size}px`;
  art.style.height = `${size}px`;
  instanceCounter += 1;
  art.innerHTML = badgeSvg(badgeSpecFor(specimen), specimen.recipeHash, `b${instanceCounter}`);
  root.append(art);

  if (options.showName !== false) {
    root.append(el("span", { className: "aa-tape aa-badge-name", text: specimen.name }));
    root.append(
      el(
        "div",
        { className: "aa-chip-row" },
        specimen.types.map((t) => {
          const chip = el("span", { className: "aa-chip", text: t.label });
          chip.classList.add(`aa-chip-${t.archetype}`);
          return chip;
        }),
      ),
    );
  }
  if (options.onClick !== undefined) {
    root.addEventListener("click", options.onClick);
    root.tabIndex = 0;
  }
  return root;
}

export interface FighterOptions {
  size: number;
  /** lime = player, cyan = opponent (handoff HP discipline). */
  side: "player" | "opponent";
  hpPct: number;
  idle?: boolean;
}

/** Arena fighter: segmented HP ring wrapping the badge (no health bars). */
export function renderFighter(specimen: Specimen, options: FighterOptions): HTMLElement {
  const root = el("div", {
    className: `aa-fighter${options.idle === true ? " idle" : ""}`,
  });
  root.style.width = `${options.size}px`;
  root.style.height = `${options.size}px`;

  const pct = Math.max(0, Math.min(1, options.hpPct));
  const ring = el("div", { className: "aa-fighter-ring" });
  ring.innerHTML = ringSvg(pct, options.side === "player" ? "lime" : "cyan", {
    cracked: pct > 0 && pct <= 0.4,
    shattered: pct === 0,
    seed: specimen.recipeHash,
  });
  const badgeWrap = el("div", { className: "aa-fighter-badge" });
  instanceCounter += 1;
  badgeWrap.innerHTML = badgeSvg(
    badgeSpecFor(specimen),
    specimen.recipeHash,
    `f${instanceCounter}`,
  );
  root.append(ring, badgeWrap);
  return root;
}
