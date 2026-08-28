/** 64-bit FNV-1a over UTF-8 bytes (spec §7e: production hash width). */

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const MASK64 = 0xffffffffffffffffn;

const encoder = new TextEncoder();

export function fnv1a64(text: string): bigint {
  let hash = FNV_OFFSET;
  for (const byte of encoder.encode(text)) {
    hash ^= BigInt(byte);
    hash = (hash * FNV_PRIME) & MASK64;
  }
  return hash;
}

export function hashToHex(hash: bigint): string {
  return hash.toString(16).padStart(16, "0");
}

/** splitmix64 step — used to expand one 64-bit seed into independent words. */
export function splitmix64(state: bigint): { next: bigint; value: bigint } {
  const s = (state + 0x9e3779b97f4a7c15n) & MASK64;
  let z = s;
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK64;
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK64;
  return { next: s, value: (z ^ (z >> 31n)) & MASK64 };
}
