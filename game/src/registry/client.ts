/**
 * Recipe registry client (spec §6): records who first discovered each recipe
 * and credits them to every later crafter.
 */

export interface DiscoveryRecord {
  recipeKeyHex: string;
  discoverer: string;
  specimenName: string;
  discoveredAt: string; // ISO timestamp
  /** True only on the response to the claim that created the record. */
  isNew: boolean;
}

export interface RegistryClient {
  /** First-writer-wins claim; returns the credited record either way. */
  claimDiscovery(
    recipeKeyHex: string,
    discoverer: string,
    specimenName: string,
  ): Promise<DiscoveryRecord>;
  lookup(recipeKeyHex: string): Promise<DiscoveryRecord | undefined>;
}
