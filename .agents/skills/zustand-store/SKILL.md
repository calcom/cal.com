---
name: zustand-store
description: Guidelines for implementing Zustand stores following the Context + Store pattern. Use when creating new Zustand stores, refactoring existing state management, or reviewing Zustand usage. Triggers on tasks involving Zustand, state management, React Context with stores, or component-scoped state.
metadata:
  author: calcom
  version: "1.0.0"
---

# Zustand Store Guidelines

Standard patterns for implementing Zustand stores in the Cal.com codebase. Based on the [Zustand and React Context](https://tkdodo.eu/blog/zustand-and-react-context) best practice.

## Core Principle: Context + Store Pattern

Use `createStore` (vanilla Zustand) combined with React Context instead of global `create()` stores. This gives you:

- **Prop initialization**: Create the store inside a component so it can receive props as true initial values.
- **Test isolation**: Each test renders its own provider with an isolated store instance -- no global state to reset.
- **Reusability**: The same component can be rendered multiple times on one page, each with its own store.

Only use a global `create()` store when the state is truly app-wide (e.g., global permissions, user preferences). For feature-scoped or component-scoped state, always use the Context + Store pattern.

## File Structure

For a feature called `MyFeature`, create two files:

```
my-feature/
  store.ts                  # Store type + factory function
  MyFeatureStoreProvider.tsx # Context, Provider component, and consumer hook
```

## Step-by-Step Implementation

### 1. Define the Store (`store.ts`)

Use `createStore` from `zustand` (not `create`). Separate state from actions. Type everything explicitly.

```typescript
"use client";

import { createStore } from "zustand";

// Props the store can be initialized with
export type MyFeatureStoreInitProps = {
  initialCount: number;
};

// Full store type: state + actions
export type MyFeatureStore = {
  // State
  count: number;
  label: string;

  // Actions
  increment: (by: number) => void;
  reset: () => void;
};

// Factory function -- called once per provider instance
export const createMyFeatureStore = ({ initialCount }: MyFeatureStoreInitProps) => {
  return createStore<MyFeatureStore>((set) => ({
    count: initialCount,
    label: "",

    increment: (by) => set((state) => ({ count: state.count + by })),
    reset: () => set({ count: initialCount }),
  }));
};
```

Key points:
- Export a `create*Store` factory function, not a hook.
- Close over the initialization props so they become true initial values (not synced via `useEffect`).
- Mark with `"use client"` when the store will be used in client components.

### 2. Create the Provider and Hook (`MyFeatureStoreProvider.tsx`)

```typescript
"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import type { StoreApi } from "zustand";

import { createMyFeatureStore, type MyFeatureStore, type MyFeatureStoreInitProps } from "./store";

const MyFeatureStoreContext = createContext<StoreApi<MyFeatureStore> | null>(null);

interface MyFeatureStoreProviderProps extends MyFeatureStoreInitProps {
  children: ReactNode;
}

export const MyFeatureStoreProvider = ({ children, ...initProps }: MyFeatureStoreProviderProps) => {
  const storeRef = useRef<StoreApi<MyFeatureStore>>();
  if (!storeRef.current) {
    storeRef.current = createMyFeatureStore(initProps);
  }

  return (
    <MyFeatureStoreContext.Provider value={storeRef.current}>
      {children}
    </MyFeatureStoreContext.Provider>
  );
};

// Generic consumer hook with selector
export const useMyFeatureStore = <T,>(
  selector: (store: MyFeatureStore) => T,
  equalityFn?: (a: T, b: T) => boolean
): T => {
  const store = useContext(MyFeatureStoreContext);

  if (!store) {
    throw new Error("useMyFeatureStore must be used within MyFeatureStoreProvider");
  }

  return useStore(store, selector, equalityFn);
};
```

Key points:
- Use `useRef` (not `useState`) to hold the store instance -- it ensures the store is created exactly once and never triggers re-renders.
- The context value is the store _instance_ (`StoreApi`), not the store's state. This is critical: the context value never changes, so the provider never causes re-renders.
- Always throw if the hook is used outside the provider.
- Support an optional `equalityFn` parameter for custom equality checks.

### 3. Export Atomic Selector Hooks (optional but recommended)

Expose fine-grained hooks so consumers don't need to write selectors inline:

```typescript
// hooks.ts
export const useCount = () => useMyFeatureStore((state) => state.count);
export const useLabel = () => useMyFeatureStore((state) => state.label);
export const useMyFeatureActions = () =>
  useMyFeatureStore((state) => ({
    increment: state.increment,
    reset: state.reset,
  }));
```

### 4. Use the Provider

Wrap the relevant subtree -- not the entire app:

```tsx
export const MyFeaturePage = ({ initialCount }: { initialCount: number }) => {
  return (
    <MyFeatureStoreProvider initialCount={initialCount}>
      <Counter />
      <Controls />
    </MyFeatureStoreProvider>
  );
};
```

### 5. Consume from Child Components

```tsx
const Counter = () => {
  const count = useMyFeatureStore((state) => state.count);
  return <div>{count}</div>;
};

const Controls = () => {
  const increment = useMyFeatureStore((state) => state.increment);
  return <button onClick={() => increment(1)}>+1</button>;
};
```

## Direct Store Access

When you need `subscribe` or `getState` outside of React's render cycle (e.g., in effects or external listeners), expose a separate hook that returns the raw store API:

```typescript
export const useMyFeatureStoreApi = () => {
  const store = useContext(MyFeatureStoreContext);
  if (!store) {
    throw new Error("useMyFeatureStoreApi must be used within MyFeatureStoreProvider");
  }
  return store;
};
```

## Anti-Patterns to Avoid

### Do NOT sync props via useEffect

```typescript
// BAD: causes a double render and introduces sync bugs
const store = create((set) => ({ bears: 0 }));

const App = ({ initialBears }) => {
  useEffect(() => {
    store.setState({ bears: initialBears });
  }, [initialBears]);
};
```

Instead, pass the value into `createStore` inside the provider (see Step 1).

### Do NOT use global stores for feature-scoped state

```typescript
// BAD: global store for state only needed in one route
export const useDashboardFilterStore = create((set) => ({
  filters: {},
  setFilters: (filters) => set({ filters }),
}));
```

Instead, scope the store to the route/feature subtree with a Context provider.

### Do NOT subscribe to the entire store

```typescript
// BAD: re-renders on every state change
const { count, label, increment, reset } = useMyFeatureStore((state) => state);
```

Instead, select only what you need:

```typescript
// GOOD: re-renders only when count changes
const count = useMyFeatureStore((state) => state.count);
```

## When to Use a Global Store

A global `create()` store is acceptable when:

1. The state is truly app-wide (e.g., permissions, auth, theme/locale preferences).
2. The store does not need initialization from props.
3. There will only ever be one instance across the entire app.

For everything else, use the Context + Store pattern.

## Testing

The Context + Store pattern makes testing straightforward:

```tsx
import { render, screen } from "@testing-library/react";
import { MyFeatureStoreProvider } from "./MyFeatureStoreProvider";
import { Counter } from "./Counter";

it("renders with initial count", () => {
  render(
    <MyFeatureStoreProvider initialCount={5}>
      <Counter />
    </MyFeatureStoreProvider>
  );

  expect(screen.getByText("5")).toBeInTheDocument();
});
```

No mocking, no global state resets between tests. Each test gets a fresh store instance.

## Reference

- Blog post: [Zustand and React Context](https://tkdodo.eu/blog/zustand-and-react-context) by TkDodo
- Zustand docs: [createStore](https://zustand.docs.pmnd.rs/guides/extracting-state-logic-into-the-store)
