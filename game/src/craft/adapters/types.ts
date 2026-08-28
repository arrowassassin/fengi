import type { TypePair } from "../../engine";

export interface CraftParentView {
  name: string;
  emoji: string;
  types: TypePair;
}

export interface CraftRequest {
  parentA: CraftParentView;
  parentB: CraftParentView;
  /** Hex 64-bit recipe hash — lets adapters seed deterministically. */
  recipeHashHex: string;
}

/** An adapter returns raw model text; the pipeline validates it (spec §3). */
export interface CraftAdapter {
  name: string;
  invent(request: CraftRequest): Promise<string>;
}
