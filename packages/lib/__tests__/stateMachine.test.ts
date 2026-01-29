import { describe, expect, it } from "vitest";
import {
  type BaseEffect,
  type BaseEvent,
  type BaseState,
  createMachineStore,
  type MachineConfig,
  transition,
} from "../stateMachine";

// Simple counter state machine for testing
type CounterState =
  | { status: "idle"; count: number }
  | { status: "counting"; count: number }
  | { status: "done"; count: number };

type CounterEvent =
  | { type: "START" }
  | { type: "INCREMENT" }
  | { type: "DECREMENT" }
  | { type: "RESET" }
  | { type: "FINISH" };

type CounterEffect = { type: "NONE" } | { type: "LOG"; message: string };

const counterMachineConfig: MachineConfig<CounterState, CounterEvent, CounterEffect> = {
  idle: {
    on: {
      START: {
        target: "counting",
        match: (state) => ({ count: state.count }),
        effect: () => ({ type: "LOG", message: "Started counting" }),
      },
    },
  },
  counting: {
    on: {
      INCREMENT: {
        target: "counting",
        match: (state) => ({ count: state.count + 1 }),
      },
      DECREMENT: [
        // Only decrement when count > 0
        {
          target: "counting",
          match: (state) => (state.count > 0 ? { count: state.count - 1 } : null),
        },
        // Fallback: stay at 0
        {
          target: "counting",
          match: (state) => ({ count: state.count }),
        },
      ],
      RESET: {
        target: "idle",
        match: () => ({ count: 0 }),
      },
      FINISH: {
        target: "done",
        match: (state) => ({ count: state.count }),
        effect: (state) => ({ type: "LOG", message: `Finished with count: ${state.count}` }),
      },
    },
  },
  done: {
    on: {
      RESET: {
        target: "idle",
        match: () => ({ count: 0 }),
      },
    },
  },
};

describe("transition function", () => {
  it("transitions state and returns effect", () => {
    const state: CounterState = { status: "idle", count: 0 };
    const result = transition(counterMachineConfig, state, { type: "START" });

    expect(result.state).toEqual({ status: "counting", count: 0 });
    expect(result.effect).toEqual({ type: "LOG", message: "Started counting" });
    expect(result.changed).toBe(true);
  });

  it("handles transitions without effects", () => {
    const state: CounterState = { status: "counting", count: 5 };
    const result = transition(counterMachineConfig, state, { type: "INCREMENT" });

    expect(result.state).toEqual({ status: "counting", count: 6 });
    expect(result.effect).toBeNull();
    expect(result.changed).toBe(true);
  });

  it("ignores events not defined for current state", () => {
    const state: CounterState = { status: "idle", count: 0 };
    const result = transition(counterMachineConfig, state, { type: "INCREMENT" });

    expect(result.state).toEqual(state);
    expect(result.effect).toBeNull();
    expect(result.changed).toBe(false);
  });

  it("respects match conditions when transitioning", () => {
    // Condition passes: count > 0
    const state1: CounterState = { status: "counting", count: 5 };
    const result1 = transition(counterMachineConfig, state1, { type: "DECREMENT" });
    expect(result1.state).toEqual({ status: "counting", count: 4 });
    expect(result1.changed).toBe(true);

    // Condition fails: count <= 0, falls through to second transition
    const state2: CounterState = { status: "counting", count: 0 };
    const result2 = transition(counterMachineConfig, state2, { type: "DECREMENT" });
    expect(result2.state).toEqual({ status: "counting", count: 0 });
    expect(result2.changed).toBe(true);
  });

  it("handles effect with state context", () => {
    const state: CounterState = { status: "counting", count: 42 };
    const result = transition(counterMachineConfig, state, { type: "FINISH" });

    expect(result.state).toEqual({ status: "done", count: 42 });
    expect(result.effect).toEqual({ type: "LOG", message: "Finished with count: 42" });
  });
});

describe("createMachineStore", () => {
  it("creates a store with initial state", () => {
    const initialState: CounterState = { status: "idle", count: 0 };
    const store = createMachineStore(counterMachineConfig, initialState);

    expect(store.getState().state).toEqual(initialState);
  });

  it("sends events and updates state", () => {
    const initialState: CounterState = { status: "idle", count: 0 };
    const store = createMachineStore(counterMachineConfig, initialState);

    store.getState().send({ type: "START" });
    expect(store.getState().state).toEqual({ status: "counting", count: 0 });

    store.getState().send({ type: "INCREMENT" });
    expect(store.getState().state).toEqual({ status: "counting", count: 1 });

    store.getState().send({ type: "INCREMENT" });
    expect(store.getState().state).toEqual({ status: "counting", count: 2 });
  });

  it("returns effect from send", () => {
    const initialState: CounterState = { status: "idle", count: 0 };
    const store = createMachineStore(counterMachineConfig, initialState);

    const effect = store.getState().send({ type: "START" });
    expect(effect).toEqual({ type: "LOG", message: "Started counting" });
  });

  it("returns null effect when no effect on transition", () => {
    const initialState: CounterState = { status: "counting", count: 0 };
    const store = createMachineStore(counterMachineConfig, initialState);

    const effect = store.getState().send({ type: "INCREMENT" });
    expect(effect).toBeNull();
  });

  it("returns null effect when event is ignored", () => {
    const initialState: CounterState = { status: "idle", count: 0 };
    const store = createMachineStore(counterMachineConfig, initialState);

    const effect = store.getState().send({ type: "INCREMENT" });
    expect(effect).toBeNull();
    expect(store.getState().state).toEqual(initialState);
  });

  it("allows subscribing to state changes", () => {
    const initialState: CounterState = { status: "idle", count: 0 };
    const store = createMachineStore(counterMachineConfig, initialState);

    const states: CounterState[] = [];
    store.subscribe((storeState) => {
      states.push(storeState.state);
    });

    store.getState().send({ type: "START" });
    store.getState().send({ type: "INCREMENT" });
    store.getState().send({ type: "INCREMENT" });

    expect(states).toEqual([
      { status: "counting", count: 0 },
      { status: "counting", count: 1 },
      { status: "counting", count: 2 },
    ]);
  });

  it("getState returns current state", () => {
    const initialState: CounterState = { status: "idle", count: 0 };
    const store = createMachineStore(counterMachineConfig, initialState);

    expect(store.getState().getState()).toEqual(initialState);

    store.getState().send({ type: "START" });
    expect(store.getState().getState()).toEqual({ status: "counting", count: 0 });
  });
});

describe("type safety", () => {
  it("enforces state has status field", () => {
    // This test verifies the type constraint at compile time
    // BaseState requires a 'status' field
    const state: BaseState<"test"> = { status: "test" };
    expect(state.status).toBe("test");
  });

  it("enforces event has type field", () => {
    // This test verifies the type constraint at compile time
    // BaseEvent requires a 'type' field
    const event: BaseEvent<"TEST"> = { type: "TEST" };
    expect(event.type).toBe("TEST");
  });

  it("enforces effect has type field", () => {
    // This test verifies the type constraint at compile time
    // BaseEffect requires a 'type' field
    const effect: BaseEffect<"TEST"> = { type: "TEST" };
    expect(effect.type).toBe("TEST");
  });
});
