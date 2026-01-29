import { useCallback, useEffect, useRef } from "react";
import { useStore } from "zustand";
import type { BaseEffect, BaseEvent, BaseState, MachineConfig } from "../stateMachine";
import { createMachineStore } from "../stateMachine";

/**
 * Configuration for useStateMachine hook
 */
export type UseStateMachineOptions<
  TState extends BaseState<string>,
  TEvent extends BaseEvent<string>,
  TEffect extends BaseEffect<string>,
  TContext,
> = {
  /** Machine configuration */
  config: MachineConfig<TState, TEvent, TEffect, TContext>;
  /** Initial state */
  initialState: TState;
  /** Current context (external data for always transitions) */
  context: TContext;
  /** Effect executor - handles side effects returned from transitions */
  onEffect: (effect: TEffect) => void;
};

/**
 * Return type for useStateMachine hook
 */
export type UseStateMachineReturn<
  TState extends BaseState<string>,
  TEvent extends BaseEvent<string>,
  TEffect extends BaseEffect<string>,
  TContext,
> = {
  /** Current machine state */
  state: TState;
  /** Send an event to the machine (executes effects automatically) */
  send: (event: TEvent) => void;
  /** Access to context for action creators */
  context: TContext;
};

/**
 * React hook for using a state machine.
 *
 * Handles:
 * - Store creation and subscription
 * - "Always" transition evaluation when context changes
 * - Effect execution
 *
 * @example
 * const { state, send } = useStateMachine({
 *   config: myMachineConfig,
 *   initialState: { status: "idle" },
 *   context: { isReady: true, data: fetchedData },
 *   onEffect: (effect) => {
 *     if (effect.type === "LOG") console.log(effect.message);
 *   },
 * });
 */
export function useStateMachine<
  TState extends BaseState<string>,
  TEvent extends BaseEvent<string>,
  TEffect extends BaseEffect<string>,
  TContext,
>({
  config,
  initialState,
  context,
  onEffect,
}: UseStateMachineOptions<TState, TEvent, TEffect, TContext>): UseStateMachineReturn<
  TState,
  TEvent,
  TEffect,
  TContext
> {
  // Create stable store reference
  const storeRef = useRef<ReturnType<typeof createMachineStore<TState, TEvent, TEffect, TContext>> | null>(
    null
  );

  if (!storeRef.current) {
    storeRef.current = createMachineStore(config, initialState);
  }

  const store = storeRef.current;

  // Subscribe to store
  const state = useStore(store, (s) => s.state);
  const storeSend = useStore(store, (s) => s.send);
  const evaluateAlways = useStore(store, (s) => s.evaluateAlways);

  // Stable effect executor reference
  const onEffectRef = useRef(onEffect);
  onEffectRef.current = onEffect;

  // Evaluate "always" transitions when context changes
  useEffect(() => {
    const effect = evaluateAlways(context);
    if (effect) {
      onEffectRef.current(effect);
    }
  }, [context, evaluateAlways]);

  // Send event and execute effect
  const send = useCallback(
    (event: TEvent) => {
      const effect = storeSend(event, context);
      if (effect) {
        queueMicrotask(() => onEffectRef.current(effect));
      }
    },
    [storeSend, context]
  );

  return { state, send, context };
}
