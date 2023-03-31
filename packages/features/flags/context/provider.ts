import * as React from "react";

import type { AppFlags } from "../config";

/**
 * Generic Feature Flags
 *
 * Entries consist of the feature flag name as the key and the resolved variant's value as the value.
 */
export type Flags = AppFlags;

/**
 * Allows you to access the flags from context
 */
const FeatureContext = React.createContext<Flags | null>(null);

/**
 * Accesses the evaluated flags from context.
 *
 * You need to render a <FeatureProvider /> further up to be able to use
 * this component.
 */
export function useFlagMap() {
  const flagMapContext = React.useContext(FeatureContext);
  if (flagMapContext === null) throw new Error("Error: useFlagMap was used outside of FeatureProvider.");
  return flagMapContext as Flags;
}

/**
 * If you want to be able to access the flags from context using `useFlagMap()`,
 * you can render the FeatureProvider at the top of your Next.js pages, like so:
 *
 * ```ts
 * import { useFlags } from "@calcom/features/flags/hooks/useFlag"
 * import { FeatureProvider, useFlagMap } from @calcom/features/flags/context/provider"
 *
 * export default function YourPage () {
 *   const flags = useFlags()
 *
 *   return (
 *     <FeatureProvider value={flags}>
 *       <YourOwnComponent />
 *     </FeatureProvider>
 *   )
 * }
 * ```
 *
 * You can then call `useFlagMap()` to access your `flagMap` from within
 * `YourOwnComponent` or further down.
 *
 * _Note that it's generally better to explicitly pass your flags down as props,
 * so you might not need this at all._
 */
export function FeatureProvider<F extends Flags>(props: { value: F; children: React.ReactNode }) {
  return React.createElement(FeatureContext.Provider, { value: props.value }, props.children);
}
