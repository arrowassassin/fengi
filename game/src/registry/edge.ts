import type { DiscoveryRecord, RegistryClient } from "./client";

/**
 * Edge registry client (spec §6, ships at launch). Speaks a tiny
 * first-writer-wins protocol to an edge function:
 *
 *   POST {base}/claim   {recipeKeyHex, discoverer, specimenName}
 *     → 200 {recipeKeyHex, discoverer, specimenName, discoveredAt, isNew}
 *   GET  {base}/recipe/{recipeKeyHex}
 *     → 200 record | 404
 *
 * Callers should wrap it with `withFallback` so an unreachable edge degrades
 * to the local registry instead of blocking crafting.
 */
export class EdgeRegistry implements RegistryClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async claimDiscovery(
    recipeKeyHex: string,
    discoverer: string,
    specimenName: string,
  ): Promise<DiscoveryRecord> {
    const response = await fetch(`${this.baseUrl}/claim`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recipeKeyHex, discoverer, specimenName }),
    });
    if (!response.ok) throw new Error(`registry claim failed: ${response.status}`);
    return (await response.json()) as DiscoveryRecord;
  }

  async lookup(recipeKeyHex: string): Promise<DiscoveryRecord | undefined> {
    const response = await fetch(`${this.baseUrl}/recipe/${recipeKeyHex}`);
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`registry lookup failed: ${response.status}`);
    return (await response.json()) as DiscoveryRecord;
  }
}

/** Primary-with-fallback composition: edge first, local when it fails. */
export function withFallback(primary: RegistryClient, fallback: RegistryClient): RegistryClient {
  return {
    async claimDiscovery(recipeKeyHex, discoverer, specimenName) {
      try {
        return await primary.claimDiscovery(recipeKeyHex, discoverer, specimenName);
      } catch {
        return fallback.claimDiscovery(recipeKeyHex, discoverer, specimenName);
      }
    },
    async lookup(recipeKeyHex) {
      try {
        return await primary.lookup(recipeKeyHex);
      } catch {
        return fallback.lookup(recipeKeyHex);
      }
    },
  };
}
