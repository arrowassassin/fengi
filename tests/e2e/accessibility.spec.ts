import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("five game screens fit and pass automated accessibility checks", async ({ page }, info) => {
  test.setTimeout(60000);
  const routes = [
    "/",
    "/play/signal",
    "/play/orbit",
    "/play/odd",
    "/play/trail",
    "/play/pairs",
    "/practice",
    "/archive",
    "/progress",
  ];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator(".loading")).toHaveCount(0);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      route,
    ).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      route,
    ).toBe(true);
    if (route === "/" || route === "/play/signal" || route === "/play/orbit")
      await page.screenshot({
        path: `/tmp/fengi-app-${route === "/" ? "home" : route.split("/").at(-1)}-${info.project.name}.png`,
        fullPage: true,
      });
  }
  expect(errors).toEqual([]);
  await page.goto("/");
  await page.getByRole("button", { name: "Use dark theme" }).click();
  const dark = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(dark.violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/play/trail");
  await expect(page.locator(".trail-board")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("health, unknown route and reduced-motion preference", async ({ page, request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect((await health.json()).status).toBe("ok");
  expect((await health.json()).persistence).toBe("ready");
  expect(health.headers()["cache-control"]).toBe("no-store");
  await page.goto("/play/not-a-game");
  await expect(page.getByRole("heading", { name: "A little off the path." })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(
    await page
      .locator(".button.primary")
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
});
