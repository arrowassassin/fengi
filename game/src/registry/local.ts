import { type StorageBackend, VersionedStore } from "../persist/store";
import type { DiscoveryRecord, RegistryClient } from "./client";

type StoredRecord = Omit<DiscoveryRecord, "isNew">;

/**
 * Offline/development registry over local storage — also the graceful
 * fallback when the edge registry is unreachable (spec §6).
 */
export class LocalRegistry implements RegistryClient {
  private readonly store: VersionedStore;

  constructor(backend: StorageBackend) {
    this.store = new VersionedStore(backend, "aa-registry", 1);
  }

  claimDiscovery(
    recipeKeyHex: string,
    discoverer: string,
    specimenName: string,
  ): Promise<DiscoveryRecord> {
    const existing = this.store.get<StoredRecord>(recipeKeyHex);
    if (existing !== undefined) {
      return Promise.resolve({ ...existing, isNew: false });
    }
    const record: StoredRecord = {
      recipeKeyHex,
      discoverer,
      specimenName,
      discoveredAt: new Date().toISOString(),
    };
    this.store.set(recipeKeyHex, record);
    return Promise.resolve({ ...record, isNew: true });
  }

  lookup(recipeKeyHex: string): Promise<DiscoveryRecord | undefined> {
    const existing = this.store.get<StoredRecord>(recipeKeyHex);
    return Promise.resolve(existing === undefined ? undefined : { ...existing, isNew: false });
  }
}
