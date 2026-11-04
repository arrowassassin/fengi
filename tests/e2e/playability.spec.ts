import { expect, test } from "@playwright/test";

// These scenarios use only visible/accessible browser information, never engine solutions.
test("Signal Grid can be played from visible counts with optional hints", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/play/signal?mode=practice&seed=player-observation");
  await page.locator(".signal-board").waitFor();
  await page.getByText("How to play", { exact: true }).click();
  await expect(page.getByText("Dotted tiles are fixed clues. No timer.")).toBeVisible();
  for (let turn = 0; turn < 40 && (await page.locator(".signal-board").count()); turn++) {
    const labels = await page
      .locator(".signal-tile")
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("aria-label") || ""));
    const cells = labels.map((s) => (s.includes(": circle") ? 1 : s.includes(": cross") ? 0 : -1));
    let move: { index: number; value: number } | undefined;
    for (const axis of ["row", "col"]) {
      for (let n = 0; n < 5 && !move; n++) {
        const count = Number(await page.locator(`[data-scene-id="${axis}-${n}"]`).textContent());
        const indexes = Array.from({ length: 5 }, (_, i) =>
          axis === "row" ? n * 5 + i : i * 5 + n,
        );
        const blanks = indexes.filter((i) => cells[i] === -1),
          circles = indexes.filter((i) => cells[i] === 1).length;
        if (blanks.length && (circles === count || circles + blanks.length === count))
          move = { index: blanks[0], value: circles === count ? 0 : 1 };
      }
    }
    if (move) {
      const tile = page.locator(`[data-cell="${move.index}"]`);
      await tile.click();
      if (move.value === 0) await tile.click();
    } else await page.getByRole("button", { name: "Reveal a tile" }).click();
  }
  await expect(page.getByRole("heading", { name: "Time well spent." })).toBeVisible();
});

test("Pair Bloom supports discovery and memory instead of reading the hidden deck", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/play/pairs?mode=practice&seed=player-observation");
  await page.locator(".pairs-board").waitFor();
  const memory = new Map<number, string>();
  for (let turn = 0; turn < 30 && (await page.locator(".pairs-board").count()); turn++) {
    const open = await page
      .locator(".pair-card:not([disabled])")
      .evaluateAll((nodes) => nodes.map((n) => Number(n.getAttribute("data-card"))));
    const knownPair = open.flatMap((a) =>
      open
        .filter((b) => b > a && memory.has(a) && memory.get(a) === memory.get(b))
        .map((b) => [a, b]),
    );
    const first = knownPair[0]?.[0] ?? open.find((i) => !memory.has(i)) ?? open[0];
    const card = page.locator(`[data-card="${first}"]`);
    await card.click();
    const symbol = (await card.getAttribute("aria-label"))?.split(": ")[1] || "";
    memory.set(first, symbol);
    const second =
      knownPair[0]?.[1] ??
      open.find((i) => i !== first && memory.get(i) === symbol) ??
      open.find((i) => i !== first && !memory.has(i)) ??
      open.find((i) => i !== first);
    if (second === undefined) throw new Error("No second card");
    const next = page.locator(`[data-card="${second}"]`);
    await next.click();
    if (await page.locator(".pairs-board").count()) {
      memory.set(
        second,
        ((await next.getAttribute("aria-label"))?.split(": ")[1] || "").replace(", matched", ""),
      );
      await page.waitForTimeout(950);
    }
  }
  await expect(page.getByRole("heading", { name: "Time well spent." })).toBeVisible();
});

test("Trail Trace can be planned from the visible garden and retraced", async ({ page }) => {
  await page.goto("/play/trail?mode=practice&seed=player-observation");
  await page.locator(".trail-board").waitFor();
  const labels = await page
    .locator(".garden-cell")
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("aria-label") || ""));
  const targets = labels.flatMap((label, i) => (label.endsWith(", seed") ? [i] : []));
  targets.push(35);
  let current = 0;
  for (const target of targets) {
    const queue = [[current]],
      seen = new Set([current]);
    let path: number[] | undefined;
    while (queue.length) {
      const candidate = queue.shift();
      if (!candidate) break;
      const at = candidate[candidate.length - 1];
      if (at === target) {
        path = candidate;
        break;
      }
      for (const next of [at - 6, at + 6, at - 1, at + 1]) {
        if (
          next < 0 ||
          next >= 36 ||
          seen.has(next) ||
          labels[next].includes("hedge") ||
          Math.abs(Math.floor(next / 6) - Math.floor(at / 6)) + Math.abs((next % 6) - (at % 6)) !==
            1
        )
          continue;
        seen.add(next);
        queue.push([...candidate, next]);
      }
    }
    if (!path) throw new Error("Visible target unreachable");
    for (const next of path.slice(1)) await page.locator(`[data-garden-cell="${next}"]`).click();
    current = target;
  }
  await expect(page.getByRole("heading", { name: "Time well spent." })).toBeVisible();
});
