import { random } from "../random";
export const STEP = 1 / 60;
export const DURATION = 45;
const TAU = Math.PI * 2;
export type OrbitState = {
  tick: number;
  angle: number;
  direction: number;
  sparks: number;
  lives: number;
  cooldown: number;
  done: boolean;
};
export const initialOrbit = (): OrbitState => ({
  tick: 0,
  angle: 0,
  direction: 1,
  sparks: 0,
  lives: 3,
  cooldown: 0,
  done: false,
});
export function distance(a: number, b: number) {
  const d = Math.abs(a - b) % TAU;
  return Math.min(d, TAU - d);
}
export function target(seed: string, index: number) {
  return 0.35 + random(`${seed}:spark:${index}`)() * (TAU - 0.7);
}
export const hazards = [1.1, 3.2, 5.3];
export function hazardActive(tick: number, index: number) {
  return (tick + index * 60) % 210 < 70;
}
export function advance(state: OrbitState, seed: string, calm = false): OrbitState {
  if (state.done) return state;
  const tick = state.tick + 1;
  const angle = (state.angle + state.direction * STEP * (calm ? 1.3 : 2.05) + TAU) % TAU;
  let { sparks, lives } = state;
  let cooldown = Math.max(0, state.cooldown - 1);
  if (distance(angle, target(seed, sparks)) < 0.13) sparks++;
  if (!cooldown && hazards.some((h, i) => hazardActive(tick, i) && distance(angle, h) < 0.11)) {
    lives--;
    cooldown = 70;
  }
  return {
    tick,
    angle,
    direction: state.direction,
    sparks,
    lives,
    cooldown,
    done: lives === 0 || tick >= DURATION / STEP,
  };
}
export function orbitScore(state: OrbitState) {
  return state.sparks * 10;
}
