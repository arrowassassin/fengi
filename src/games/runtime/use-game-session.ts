"use client";
import { useCallback, useMemo } from "react";
import { useSavedGame } from "../../components/use-saved-game";
import type { Session } from "../registry";
import type { GameDefinition } from "./contracts";
export function useGameSession<S, C>(definition: GameDefinition<S, C>, session: Session) {
  const initial = useMemo(() => definition.initial(session), [definition, session]);
  const saved = useSavedGame(
    session,
    initial,
    (value) => definition.validate(session, value),
    (state) => definition.describe(session, state),
  );
  const dispatch = useCallback(
    (command: C) => saved.setState((state) => definition.reduce(session, state, command)),
    [definition, session, saved.setState],
  );
  return {
    state: saved.state,
    ready: saved.ready,
    warning: saved.warning,
    saveNow: saved.saveNow,
    commit: saved.setState,
    dispatch,
  };
}
