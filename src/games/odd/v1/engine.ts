import { random, shuffled } from "../../releases/random-v1";
import { type Category, categories } from "./content";
export function dailyPrompts(seed: string): Category[] {
  return shuffled(categories, random(`odd:v1:${seed}`)).slice(0, 3);
}
export function normalize(answer: string) {
  return answer.normalize("NFKC").trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}
export function judge(category: Category, input: string) {
  const normalized = normalize(input);
  return (
    category.answers.find(
      (a) =>
        normalize(a.word) === normalized ||
        a.aliases?.some((alias) => normalize(alias) === normalized),
    ) ?? null
  );
}
