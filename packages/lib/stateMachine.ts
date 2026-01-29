/**
 * Generic State Machine Engine
 *
 * A lightweight, reusable state machine implementation inspired by XState.
 * Supports conditional transitions via `match`, effects, multiple transitions per event, and "always" transitions.
 *
 * Usage:
 *   1. Define your machine config with states, events, and transitions
 *   2. Use `useStateMachine` hook in React components (from @calcom/lib/hooks/useStateMachine)
 *   3. Or create a store manually with `createMachineStore` for vanilla JS
 */

import { createStore } from "zustand/vanilla";

// ============================================================================
// Types
// ============================================================================

/**
 * Base state type - all states must have a `status` field
 */
export type BaseState<TStatus extends string> = {
  status: TStatus;
};

/**
 * Base event type - all events must have a `type` field
 */
export type BaseEvent<TType extends string> = {
  type: TType;
};

/**
 * Effect type - side effects returned from transitions
 */
export type BaseEffect<TEffectType extends string> = {
  type: TEffectType;
};

/**
 * Extract state variant by status - narrows a state union to a specific variant
 */
export type StateForStatus<TState extends BaseState<string>, TStatus extends TState["status"]> = Extract<
  TState,
  { status: TStatus }
>;

/**
 * Transition configuration for event-triggered transitions.
 *
 * Uses `match` to determine if transition fires and compute new state data:
 * - Returns `null` → skip this transition, try next one
 * - Returns object → fire transition with that data merged into new state
 */
export type TransitionConfig<
  TState extends BaseState<string>,
  TEvent extends BaseEvent<string>,
  TEffect extends BaseEffect<string>,
  TContext = unknown,
  TCurrentStatus extends TState["status"] = TState["status"],
> = {
  /** Target state status - determines the `status` field of the new state */
  target: TState["status"];
  /** Match function - returns null to skip, or state data to fire transition */
  match: (
    state: StateForStatus<TState, TCurrentStatus>,
    event: TEvent,
    context?: TContext
  ) => Omit<TState, "status"> | null;
  /** Optional effect - side effect to execute on transition */
  effect?: (state: StateForStatus<TState, TCurrentStatus>, event: TEvent, context?: TContext) => TEffect;
};

/**
 * Always transition configuration - auto-transitions based on context.
 *
 * Uses `match` to determine if transition fires and compute new state data:
 * - Returns `null` → skip this transition, try next one
 * - Returns object → fire transition with that data merged into new state
 */
export type AlwaysTransitionConfig<
  TState extends BaseState<string>,
  TEffect extends BaseEffect<string>,
  TContext = unknown,
  TCurrentStatus extends TState["status"] = TState["status"],
> = {
  /** Target state status - determines the `status` field of the new state */
  target: TState["status"];
  /** Match function - returns null to skip, or state data to fire transition */
  match: (state: StateForStatus<TState, TCurrentStatus>, context: TContext) => Omit<TState, "status"> | null;
  /** Optional effect - side effect to execute on transition */
  effect?: (state: StateForStatus<TState, TCurrentStatus>, context: TContext) => TEffect;
};

/**
 * State configuration - defines which events a state responds to, with narrowed state type
 */
export type StateConfig<
  TState extends BaseState<string>,
  TEvent extends BaseEvent<string>,
  TEffect extends BaseEffect<string>,
  TContext = unknown,
  TCurrentStatus extends TState["status"] = TState["status"],
> = {
  /** Event-triggered transitions */
  on?: Partial<
    Record<
      TEvent["type"],
      | TransitionConfig<TState, TEvent, TEffect, TContext, TCurrentStatus>
      | TransitionConfig<TState, TEvent, TEffect, TContext, TCurrentStatus>[]
    >
  >;
  /** Auto-transitions that fire when conditions pass (evaluated when context changes) */
  always?: AlwaysTransitionConfig<TState, TEffect, TContext, TCurrentStatus>[];
};

/**
 * Machine configuration - the full state machine definition
 * Each status key maps to a StateConfig that receives the narrowed state type for that status
 */
export type MachineConfig<
  TState extends BaseState<string>,
  TEvent extends BaseEvent<string>,
  TEffect extends BaseEffect<string>,
  TContext = unknown,
> = {
  [K in TState["status"]]: StateConfig<TState, TEvent, TEffect, TContext, K>;
};

/**
 * Result from processing an event or always transition
 */
export type TransitionResult<TState extends BaseState<string>, TEffect extends BaseEffect<string>> = {
  state: TState;
  effect: TEffect | null;
  changed: boolean;
};

/**
 * Store state shape
 */
export type MachineStoreState<
  TState extends BaseState<string>,
  TEvent extends BaseEvent<string>,
  TEffect extends BaseEffect<string>,
  TContext = unknown,
> = {
  /** Current machine state */
  state: TState;
  /** Send an event to the machine */
  send: (event: TEvent, context?: TContext) => TEffect | null;
  /** Get the current state (for external access) */
  getState: () => TState;
  /** Evaluate always transitions with given context */
  evaluateAlways: (context: TContext) => TEffect | null;
};

// ============================================================================
// Interpreter
// ============================================================================

/**
 * Process an event through the state machine
 */
export function transition<
  TState extends BaseState<string>,
  TEvent extends BaseEvent<string>,
  TEffect extends BaseEffect<string>,
  TContext = unknown,
>(
  config: MachineConfig<TState, TEvent, TEffect, TContext>,
  state: TState,
  event: TEvent,
  context?: TContext
): TransitionResult<TState, TEffect> {
  const stateConfig = config[state.status as TState["status"]];
  if (!stateConfig || !stateConfig.on) {
    return { state, effect: null, changed: false };
  }

  const transitions = stateConfig.on[event.type as TEvent["type"]];
  if (!transitions) {
    return { state, effect: null, changed: false };
  }

  // Handle single transition or array of transitions
  const transitionList = Array.isArray(transitions) ? transitions : [transitions];

  for (const t of transitionList) {
    const matchResult = t.match(state, event, context);
    if (matchResult === null) {
      continue;
    }

    // Found a valid transition - merge status from target with match result
    const newState = { status: t.target, ...matchResult } as TState;
    const effect = t.effect ? t.effect(state, event, context) : null;

    return { state: newState, effect, changed: true };
  }

  // No transition matched
  return { state, effect: null, changed: false };
}

/**
 * Evaluate "always" transitions for the current state
 * Returns the first matching transition result, or unchanged if none match
 */
export function evaluateAlwaysTransitions<
  TState extends BaseState<string>,
  TEvent extends BaseEvent<string>,
  TEffect extends BaseEffect<string>,
  TContext,
>(
  config: MachineConfig<TState, TEvent, TEffect, TContext>,
  state: TState,
  context: TContext
): TransitionResult<TState, TEffect> {
  const stateConfig = config[state.status as TState["status"]];
  if (!stateConfig || !stateConfig.always) {
    return { state, effect: null, changed: false };
  }

  for (const t of stateConfig.always) {
    // Cast state to the narrowed type - we know it matches because we looked up by status
    const narrowedState = state as StateForStatus<TState, TState["status"]>;
    const matchResult = t.match(narrowedState, context);
    if (matchResult === null) {
      continue;
    }

    // Found a valid transition - merge status from target with match result
    const newState = { status: t.target, ...matchResult } as TState;
    const effect = t.effect ? t.effect(narrowedState, context) : null;
    return { state: newState, effect, changed: true };
  }

  return { state, effect: null, changed: false };
}

// ============================================================================
// Zustand Store Factory
// ============================================================================

/**
 * Create a Zustand store for a state machine
 */
export function createMachineStore<
  TState extends BaseState<string>,
  TEvent extends BaseEvent<string>,
  TEffect extends BaseEffect<string>,
  TContext = unknown,
>(config: MachineConfig<TState, TEvent, TEffect, TContext>, initialState: TState) {
  return createStore<MachineStoreState<TState, TEvent, TEffect, TContext>>((set, get) => ({
    state: initialState,

    send: (event: TEvent, context?: TContext) => {
      const currentState = get().state;
      const result = transition(config, currentState, event, context);

      if (result.changed) {
        set({ state: result.state });
      }

      return result.effect;
    },

    getState: () => get().state,

    evaluateAlways: (context: TContext) => {
      const currentState = get().state;
      const result = evaluateAlwaysTransitions(config, currentState, context);

      if (result.changed) {
        set({ state: result.state });
      }

      return result.effect;
    },
  }));
}

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Type helper to extract state type from a machine config
 */
export type InferState<T> = T extends MachineConfig<infer S, infer _E, infer _F, infer _C> ? S : never;

/**
 * Type helper to extract event type from a machine config
 */
export type InferEvent<T> = T extends MachineConfig<infer _S, infer E, infer _F, infer _C> ? E : never;

/**
 * Type helper to extract effect type from a machine config
 */
export type InferEffect<T> = T extends MachineConfig<infer _S, infer _E, infer F, infer _C> ? F : never;

/**
 * Type helper to extract context type from a machine config
 */
export type InferContext<T> = T extends MachineConfig<infer _S, infer _E, infer _F, infer C> ? C : never;
