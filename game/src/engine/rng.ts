import { splitmix64 } from "./hash";

/**
 * Deterministic PRNG for battles: a 64-bit seed is expanded via splitmix64
 * into four 32-bit words feeding an sfc32 stream. State is serializable so a
 * battle can be snapshotted and resumed to an identical remaining log.
 */

export interface RngState {
  a: number;
  b: number;
  c: number;
  d: number;
}

export interface Rng {
  nextU32(): number;
  /** Uniform float in [0, 1). */
  float(): number;
  /** Uniform integer in [0, n). */
  int(n: number): number;
  /** True with `pct` percent probability. */
  chance(pct: number): boolean;
  state(): RngState;
}

function sfc32(s: RngState): Rng {
  let { a, b, c, d } = s;
  const nextU32 = (): number => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    const t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const r = (t + d) | 0;
    c = (c + r) | 0;
    return r >>> 0;
  };
  return {
    nextU32,
    float: () => nextU32() / 4294967296,
    int: (n: number) => (n <= 0 ? 0 : nextU32() % n),
    chance(pct: number): boolean {
      if (pct >= 100) return true;
      if (pct <= 0) return false;
      return this.int(100) < pct;
    },
    state: () => ({ a: a >>> 0, b: b >>> 0, c: c >>> 0, d: d >>> 0 }),
  };
}

export function createRng(seed: bigint): Rng {
  const one = splitmix64(seed);
  const two = splitmix64(one.next);
  const lo = (v: bigint): number => Number(v & 0xffffffffn);
  const hi = (v: bigint): number => Number(v >> 32n);
  const rng = sfc32({ a: lo(one.value), b: hi(one.value), c: lo(two.value), d: hi(two.value) });
  // Warm up: sfc32 needs a few rounds to decorrelate close seeds.
  for (let i = 0; i < 12; i++) rng.nextU32();
  return rng;
}

export function restoreRng(state: RngState): Rng {
  return sfc32(state);
}
