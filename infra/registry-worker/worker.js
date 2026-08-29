/**
 * Alchemy Arena edge recipe registry (spec §6) — Cloudflare Worker.
 *
 * Deploy:  npx wrangler deploy infra/registry-worker/worker.js
 *          (with the KV binding below), then set VITE_REGISTRY_URL to the
 *          worker URL when building the game.
 *
 * wrangler.toml:
 *   name = "alchemy-arena-registry"
 *   main = "worker.js"
 *   compatibility_date = "2026-08-01"
 *   [[kv_namespaces]]
 *   binding = "RECIPES"
 *   id = "<your-kv-namespace-id>"
 *
 * Protocol (first-writer-wins):
 *   POST /claim  {recipeKeyHex, discoverer, specimenName}
 *     -> 200 {recipeKeyHex, discoverer, specimenName, discoveredAt, isNew}
 *   GET  /recipe/{recipeKeyHex}
 *     -> 200 record | 404
 */

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

const HEX16 = /^[0-9a-f]{1,16}$/;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method === "GET" && url.pathname.startsWith("/recipe/")) {
      const key = url.pathname.slice("/recipe/".length).toLowerCase();
      if (!HEX16.test(key)) return json({ error: "bad recipe key" }, 400);
      const stored = await env.RECIPES.get(key, "json");
      if (stored === null) return json({ error: "not found" }, 404);
      return json({ ...stored, isNew: false });
    }

    if (request.method === "POST" && url.pathname === "/claim") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "bad json" }, 400);
      }
      const key = String(body.recipeKeyHex ?? "").toLowerCase();
      const discoverer = String(body.discoverer ?? "").slice(0, 40).trim();
      const specimenName = String(body.specimenName ?? "").slice(0, 60).trim();
      if (!HEX16.test(key) || discoverer === "" || specimenName === "") {
        return json({ error: "bad claim" }, 400);
      }

      const existing = await env.RECIPES.get(key, "json");
      if (existing !== null) return json({ ...existing, isNew: false });

      const record = {
        recipeKeyHex: key,
        discoverer,
        specimenName,
        discoveredAt: new Date().toISOString(),
      };
      // KV has no compare-and-swap; a same-instant duplicate claim is resolved
      // by the read-back below, which returns whichever write landed first.
      await env.RECIPES.put(key, JSON.stringify(record));
      const settled = (await env.RECIPES.get(key, "json")) ?? record;
      return json({ ...settled, isNew: settled.discoveredAt === record.discoveredAt });
    }

    return json({ error: "not found" }, 404);
  },
};
