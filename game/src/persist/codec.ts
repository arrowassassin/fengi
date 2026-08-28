import type { Specimen } from "../engine";

/** JSON-safe specimen encoding: the 64-bit recipe hash travels as hex. */

export interface SerializedSpecimen extends Omit<Specimen, "recipeHash"> {
  recipeHashHex: string;
}

export function serializeSpecimen(specimen: Specimen): SerializedSpecimen {
  const { recipeHash, ...rest } = specimen;
  return { ...rest, recipeHashHex: recipeHash.toString(16) };
}

export function deserializeSpecimen(data: SerializedSpecimen): Specimen {
  const { recipeHashHex, ...rest } = data;
  return { ...rest, recipeHash: BigInt(`0x${recipeHashHex}`) };
}
