import type { Session } from "../registry";
/** Renderer-independent contract. Only S is persisted; commands and clocks never contain engine objects. */
export interface GameDefinition<S, C> {
  readonly version: number;
  initial(session: Session): S;
  validate(session: Session, value: unknown): S | null;
  reduce(session: Session, state: S, command: C): S;
  describe(session: Session, state: S): { completed: boolean; summary: string };
}
export type SceneNode = {
  id: string;
  text: string;
  fill?: string;
  color: string;
  shape?: "tile" | "text";
  fixed?: boolean;
  opacity?: number;
};
export type OrbitPicture = {
  angle: number;
  spark: number;
  gates: { angle: number; closed: boolean }[];
  score: number;
  running: boolean;
  recovering: boolean;
  phase?: "ready" | "paused";
};
export type ScenePicture = { nodes: SceneNode[]; orbit?: OrbitPicture };
