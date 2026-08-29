import { describe, expect, it } from "vitest";
import { hashToHex } from "../engine";
import { MemoryBackend } from "../persist/store";
import { LocalRegistry } from "./local";
import { recipeHash } from "./recipe";

describe("recipe registry — first-discovery credits (spec §6)", () => {
  it("first claim wins and is marked new", async () => {
    const registry = new LocalRegistry(new MemoryBackend());
    const key = hashToHex(recipeHash("starter-flame", "starter-tide"));
    const first = await registry.claimDiscovery(key, "Ada", "Steam Wraith");
    expect(first.isNew).toBe(true);
    expect(first.discoverer).toBe("Ada");
  });

  it("later claims credit the original discoverer", async () => {
    const registry = new LocalRegistry(new MemoryBackend());
    const key = hashToHex(recipeHash("starter-flame", "starter-briar"));
    await registry.claimDiscovery(key, "Ada", "Molten Fern");
    const second = await registry.claimDiscovery(key, "Basil", "Molten Fern");
    expect(second.isNew).toBe(false);
    expect(second.discoverer).toBe("Ada");
  });

  it("claims persist across registry instances sharing a backend", async () => {
    const backend = new MemoryBackend();
    const key = hashToHex(recipeHash("starter-storm", "starter-rime"));
    await new LocalRegistry(backend).claimDiscovery(key, "Ada", "Aurora Raiju");
    const record = await new LocalRegistry(backend).lookup(key);
    expect(record?.discoverer).toBe("Ada");
  });

  it("lookup of an unclaimed recipe returns undefined", async () => {
    const registry = new LocalRegistry(new MemoryBackend());
    expect(await registry.lookup("00000000deadbeef")).toBeUndefined();
  });
});
