import { paintSigil, sigilCommands } from "../../art/sigil";
import type { Specimen } from "../../engine";
import { el } from "../dom";

export interface SealOptions {
  size?: number;
  selected?: boolean;
  fainted?: boolean;
  showName?: boolean;
  onClick?: () => void;
}

function tokenValue(name: string, fallback: string): string {
  if (typeof getComputedStyle !== "function") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value === "" ? fallback : value;
}

/** Specimen seal component: seeded sigil canvas + name + type chips (§7e). */
export function renderSeal(specimen: Specimen, options: SealOptions = {}): HTMLElement {
  const size = options.size ?? 112;
  const root = el("div", {
    className: `aa-seal${options.selected === true ? " selected" : ""}${options.fainted === true ? " fainted" : ""}`,
  });
  root.setAttribute("role", "img");
  root.setAttribute("aria-label", `${specimen.name}, ${specimen.types.join(" and ")} specimen`);

  const canvas = el("canvas");
  canvas.width = size;
  canvas.height = size;
  // jsdom has no 2D context — painting is progressive enhancement.
  const ctx = typeof canvas.getContext === "function" ? canvas.getContext("2d") : null;
  if (ctx !== null) {
    paintSigil(ctx, size, sigilCommands(specimen.recipeHash, specimen.emoji), {
      brass: tokenValue("--aa-brass-500", "#d9a441"),
      brassFaint: tokenValue("--aa-brass-faint", "rgba(217,164,65,0.35)"),
      ink: tokenValue("--aa-ink-200", "#e8e2d4"),
      emojiFont: '"Noto Emoji", sans-serif',
    });
  }
  root.append(canvas);

  if (options.showName !== false) {
    root.append(el("div", { className: "aa-seal-name", text: specimen.name }));
    root.append(
      el(
        "div",
        {},
        specimen.types.map((t) => el("span", { className: "aa-chip", text: t })),
      ),
    );
  }
  if (options.onClick !== undefined) {
    root.addEventListener("click", options.onClick);
    root.tabIndex = 0;
  }
  return root;
}
