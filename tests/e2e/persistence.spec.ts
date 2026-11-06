import { expect, test } from "@playwright/test";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin, "X-Fengi-Client": "1" };
test("server restores cleared local saves and recovery opens the same profile in another browser", async ({
  page,
  context,
  browser,
}) => {
  const url = "/play/pairs?mode=practice&seed=recovery-test";
  await page.goto(url);
  await expect(page.locator(".pair-card")).toHaveCount(16);
  await expect
    .poll(async () =>
      (await context.request.get("/api/progress")).json().then((x) => x.saves?.length ?? -1),
    )
    .toBe(1);
  await page.goto("/progress");
  await page.getByRole("button", { name: "Create recovery code" }).click();
  const code = await page.getByLabel("Save this recovery code").inputValue();
  expect(code).toHaveLength(43);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole("heading", { name: "Pair Bloom", exact: true })).toBeVisible();
  const fresh = await browser.newContext();
  const restored = await fresh.newPage();
  await restored.goto("/progress");
  await restored.getByText("Restore another profile", { exact: true }).click();
  await restored.getByLabel("Recovery code", { exact: true }).fill(code);
  await restored.getByRole("button", { name: "Restore profile", exact: true }).click();
  await expect(restored.getByRole("heading", { name: "Pair Bloom", exact: true })).toBeVisible();
  const used = await fresh.request.post("/api/recovery", {
    headers,
    data: { action: "restore", code },
  });
  expect(used.status()).toBe(400);
  await fresh.close();
});
test("same-session tabs have one editor and release ownership when closed", async ({
  page,
  context,
}) => {
  const url = "/play/signal?mode=practice&seed=tab-test";
  await page.goto(url);
  await expect(page.locator(".signal-board")).toBeVisible();
  const second = await context.newPage();
  await second.goto(url);
  await expect(
    second.getByRole("heading", { name: "This game is open in another tab." }),
  ).toBeVisible();
  await page.close();
  await second.getByRole("button", { name: "Try again" }).click();
  await expect(second.locator(".signal-board")).toBeVisible();
});
test("API isolates profiles, rejects cross-origin and oversized writes, validates games, and detects stale revisions", async ({
  page,
  context,
  browser,
}) => {
  await page.goto("/play/pairs?mode=practice&seed=api-test");
  await expect(page.locator(".pair-card")).toHaveCount(16);
  await expect
    .poll(async () =>
      (await context.request.get("/api/progress")).json().then((x) => x.saves?.length ?? -1),
    )
    .toBe(1);
  const { saves, profileId } = await (await context.request.get("/api/progress")).json(),
    saved = saves[0];
  const input = {
    record: saved.record,
    profileId,
    expectedRevision: saved.revision,
    mutationId: crypto.randomUUID(),
  };
  expect(
    (
      await context.request.put("/api/progress", {
        headers: { ...headers, Origin: "https://elsewhere.example" },
        data: input,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await context.request.put("/api/progress", {
        headers,
        data: { ...input, record: { ...input.record, state: { matched: [0], turns: 0 } } },
      })
    ).status(),
  ).toBe(422);
  expect(
    (
      await context.request.put("/api/progress", { headers, data: { padding: "x".repeat(40000) } })
    ).status(),
  ).toBe(413);
  expect((await context.request.put("/api/progress", { headers, data: input })).status()).toBe(200);
  expect((await context.request.put("/api/progress", { headers, data: input })).status()).toBe(200);
  expect(
    (
      await context.request.put("/api/progress", {
        headers,
        data: { ...input, mutationId: crypto.randomUUID() },
      })
    ).status(),
  ).toBe(409);
  const other = await browser.newContext();
  expect((await other.request.get(`${origin}/api/progress`)).status()).toBe(401);
  await other.close();
  const cookie = (await context.cookies()).find((c) => c.name === "fengi_session");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Strict");
});
test("unknown rule versions cannot load or overwrite existing saves", async ({ page }) => {
  await page.goto("/play/signal?version=99");
  await expect(page.getByRole("heading", { name: "This edition is unavailable." })).toBeVisible();
  await expect(page.locator(".signal-board")).toHaveCount(0);
});
test("offline edits remain locally and synchronize after reconnection", async ({
  page,
  context,
}) => {
  await page.goto("/play/signal?mode=practice&seed=offline-test");
  const tile = page.locator(".signal-tile:not([disabled])").first();
  await expect(tile).toBeVisible();
  await expect
    .poll(async () =>
      (await context.request.get("/api/progress")).json().then((x) => x.saves?.length ?? -1),
    )
    .toBe(1);
  await context.setOffline(true);
  await tile.click();
  await expect(tile).toHaveAttribute("data-state", "1");
  await expect(
    page.getByRole("status").filter({ hasText: "Server save is pending" }),
  ).toBeVisible();
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect
    .poll(async () =>
      page.evaluate(() =>
        Object.keys(localStorage)
          .filter((k) => k.startsWith("fengi:save:"))
          .map((k) => JSON.parse(localStorage.getItem(k) ?? "{}").pending)
          .some(Boolean),
      ),
    )
    .toBe(false);
  await page.reload();
  await expect(tile).toHaveAttribute("data-state", "1");
});
test("a concurrent server edit opens a recoverable conflict instead of overwriting it", async ({
  page,
  context,
}) => {
  await page.goto("/play/signal?mode=practice&seed=conflict-test");
  const tile = page.locator(".signal-tile:not([disabled])").first();
  await expect(tile).toBeVisible();
  await expect
    .poll(async () =>
      (await context.request.get("/api/progress")).json().then((x) => x.saves?.length ?? -1),
    )
    .toBe(1);
  const { saves, profileId } = await (await context.request.get("/api/progress")).json();
  expect(
    (
      await context.request.put("/api/progress", {
        headers,
        data: {
          profileId,
          record: saves[0].record,
          expectedRevision: saves[0].revision,
          mutationId: crypto.randomUUID(),
        },
      })
    ).status(),
  ).toBe(200);
  await tile.click();
  await expect(
    page.getByRole("heading", { name: "Your progress changed elsewhere." }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download local copy" }).click();
  expect((await download).suggestedFilename()).toBe("fengi-progress.json");
  await page.getByRole("button", { name: "Load server copy" }).click();
  await expect(tile).toHaveAttribute("data-state", "-1");
});
test("an original browser-only v1 save imports without being reset", async ({ page, context }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "fengi:progress:v1",
      JSON.stringify([
        {
          version: 1,
          id: "pairs:v1:practice:old-save:standard",
          game: "pairs",
          mode: "practice",
          label: "Practice",
          updated: 1,
          completed: false,
          summary: "5 turns",
          state: { matched: [], turns: 5 },
        },
      ]),
    ),
  );
  await page.goto("/play/pairs?mode=practice&seed=old-save&version=1");
  await expect(page.locator(".pair-card")).toHaveCount(16);
  await expect
    .poll(async () =>
      (await context.request.get("/api/progress"))
        .json()
        .then((x) => x.saves?.[0]?.record.state.turns),
    )
    .toBe(5);
});
test("older retained offline saves resume and exports include more than sixty pending records", async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("retention-fixture")) return;
    for (let i = 0; i < 70; i++) {
      const id = `pairs:v1:practice:retained-${i}:standard`;
      localStorage.setItem(
        `fengi:save:${id}`,
        JSON.stringify({
          version: 1,
          id,
          game: "pairs",
          mode: "practice",
          label: "Practice",
          updated: i + 1,
          completed: false,
          summary: `${i + 5} turns`,
          state: { matched: [], turns: i + 5 },
          pending: true,
          baseRevision: 0,
          mutationId: crypto.randomUUID(),
        }),
      );
    }
    localStorage.setItem("retention-fixture", "ready");
  });
  await page.goto("/play/pairs?mode=practice&seed=retained-0&version=1");
  await expect(page.locator(".pair-card")).toHaveCount(16);
  await expect
    .poll(async () =>
      (await context.request.get("/api/progress"))
        .json()
        .then((x) => x.saves?.[0]?.record.state.turns),
    )
    .toBe(5);
  await page.goto("/progress");
  await expect(page.locator(".history-list article")).toHaveCount(60);
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export progress", exact: true }).click();
  const file = await (await downloaded).path();
  if (!file) throw new Error("Export missing");
  const { readFile } = await import("node:fs/promises");
  const exported = JSON.parse(await readFile(file, "utf8"));
  expect(exported.records).toHaveLength(70);
  expect(exported.records.filter((r: { pending?: boolean }) => r.pending)).toHaveLength(69);
  expect(
    exported.records.find((r: { id: string }) => r.id === "pairs:v1:practice:retained-1:standard")
      .state.turns,
  ).toBe(6);
});
