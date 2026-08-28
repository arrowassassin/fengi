/**
 * Versioned key-value persistence over a pluggable string backend:
 * localStorage in the browser, MemoryBackend in tests/node. Corrupt or
 * version-mismatched payloads read as absent — never as crashes.
 */

export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryBackend implements StorageBackend {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

interface Envelope {
  v: number;
  data: unknown;
}

export class VersionedStore {
  private readonly backend: StorageBackend;
  private readonly namespace: string;
  private readonly version: number;

  constructor(backend: StorageBackend, namespace: string, version: number) {
    this.backend = backend;
    this.namespace = namespace;
    this.version = version;
  }

  private key(name: string): string {
    return `${this.namespace}:${name}`;
  }

  get<T>(name: string): T | undefined {
    const raw = this.backend.getItem(this.key(name));
    if (raw === null) return undefined;
    try {
      const envelope = JSON.parse(raw) as Envelope;
      if (envelope.v !== this.version) return undefined;
      return envelope.data as T;
    } catch {
      return undefined;
    }
  }

  set(name: string, data: unknown): void {
    try {
      this.backend.setItem(this.key(name), JSON.stringify({ v: this.version, data }));
    } catch {
      // Quota or privacy-mode failure: persistence is best-effort.
    }
  }

  remove(name: string): void {
    this.backend.removeItem(this.key(name));
  }
}

/** The browser backend, guarded so node/test environments never touch it. */
export function defaultBackend(): StorageBackend {
  if (typeof localStorage !== "undefined") return localStorage;
  return new MemoryBackend();
}
