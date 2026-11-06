import { expect, test } from "@playwright/test";

for (const interruption of [
  "editor stays open",
  "editor closes",
  "progress navigates away",
] as const) {
  test(`delayed history cannot replace a pending edit when ${interruption}`, async ({
    page,
    context,
  }) => {
    const url = "/play/signal?mode=practice&seed=history-race";
    const key = "fengi:save:signal:v1:practice:history-race:standard";
    await page.goto(url);
    const tile = page.locator(".signal-tile:not([disabled])").first();
    await expect(tile).toBeVisible();
    const cell = Number(await tile.getAttribute("data-cell"));
    await expect
      .poll(() =>
        page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").pending, key),
      )
      .toBe(false);

    // Capture a real server response before the edit, but do not deliver it yet.
    const history = await context.newPage();
    let releaseResponse: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    let responseCaptured: () => void = () => {};
    const captured = new Promise<void>((resolve) => {
      responseCaptured = resolve;
    });
    let requests = 0;
    await history.route("**/api/progress", async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      if (requests++ > 0) return route.abort("internetdisconnected");
      const response = await route.fetch();
      responseCaptured();
      await held;
      await route.fulfill({ response });
    });
    await history.goto("/progress");
    await captured;
    // Only the editor's save connection fails; the history request remains in flight.
    await page.route("**/api/progress", (route) =>
      route.request().method() === "PUT" ? route.abort("internetdisconnected") : route.continue(),
    );
    await tile.click();
    await expect(tile).toHaveAttribute("data-state", "1");
    await expect(
      page.getByRole("status").filter({ hasText: "Server save is pending" }),
    ).toBeVisible();
    const pending = await page.evaluate((key) => localStorage.getItem(key), key);
    expect(JSON.parse(pending ?? "{}").pending).toBe(true);
    if (interruption === "editor closes") await page.close();
    if (interruption === "progress navigates away")
      await history.getByRole("link", { name: "Practice", exact: true }).click();
    const delivered = history.waitForResponse(
      (response) =>
        response.url().endsWith("/api/progress") && response.request().method() === "GET",
    );
    releaseResponse();
    await delivered;
    // Flush the response's React/effect work before checking the shared cache.
    if (interruption !== "progress navigates away")
      await expect(
        history.getByRole("heading", { name: "Signal Grid", exact: true }),
      ).toBeVisible();
    await history.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    expect(await history.evaluate((key) => localStorage.getItem(key), key)).toBe(pending);

    // Reopen after interruption; the pending move must survive and eventually reach the server.
    const resumed = interruption === "editor closes" ? await context.newPage() : page;
    await resumed.unroute("**/api/progress");
    await resumed.goto(url);
    await expect(resumed.locator(`[data-cell="${cell}"]`)).toHaveAttribute("data-state", "1");
    await expect
      .poll(() =>
        resumed.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").pending, key),
      )
      .toBe(false);
    const server = await (await context.request.get("/api/progress")).json();
    expect(server.saves[0].record.state.cells[cell]).toBe(1);
  });
}
