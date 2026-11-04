import { random, shuffled } from "../random";
export const symbols = ["✿", "☀", "☾", "✦", "♣", "♥", "◆", "●"];
export const symbolNames = [
  "flower",
  "sun",
  "moon",
  "star",
  "clover",
  "heart",
  "diamond",
  "circle",
];
export function createDeck(seed: string) {
  return shuffled([...symbols.keys(), ...symbols.keys()], random(`pairs:v1:${seed}`));
}
export function isPair(deck: number[], a: number, b: number) {
  return a !== b && deck[a] === deck[b];
}
