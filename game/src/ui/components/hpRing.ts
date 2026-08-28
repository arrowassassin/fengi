/** Ink-ring HP: SVG circle that drains as HP falls (COMPONENTS.md). */

const NS = "http://www.w3.org/2000/svg";

export function renderHpRing(currentHp: number, maxHp: number, size = 56): SVGSVGElement {
  const ratio = maxHp <= 0 ? 0 : Math.max(0, Math.min(1, currentHp / maxHp));
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const state = ratio > 0.5 ? "healthy" : ratio > 0.2 ? "wounded" : "critical";

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "aa-hp-ring");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("role", "meter");
  svg.setAttribute("aria-valuemin", "0");
  svg.setAttribute("aria-valuemax", String(maxHp));
  svg.setAttribute("aria-valuenow", String(currentHp));

  const track = document.createElementNS(NS, "circle");
  track.setAttribute("class", "track");
  const fill = document.createElementNS(NS, "circle");
  fill.setAttribute("class", `fill ${state}`);
  for (const circle of [track, fill]) {
    circle.setAttribute("cx", String(size / 2));
    circle.setAttribute("cy", String(size / 2));
    circle.setAttribute("r", String(radius));
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke-width", String(stroke));
  }
  fill.setAttribute("stroke-dasharray", String(circumference));
  fill.setAttribute("stroke-dashoffset", String(circumference * (1 - ratio)));
  fill.setAttribute("stroke-linecap", "round");
  fill.setAttribute("transform", `rotate(-90 ${size / 2} ${size / 2})`);

  const label = document.createElementNS(NS, "text");
  label.setAttribute("x", String(size / 2));
  label.setAttribute("y", String(size / 2 + 4));
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("font-size", "12");
  label.textContent = String(Math.max(0, currentHp));

  svg.append(track, fill, label);
  return svg;
}
