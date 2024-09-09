/// <reference types="react" />
import type { AppFlags } from "../config";
/**
 * Generic Feature Flags
 *
 * Entries consist of the feature flag name as the key and the resolved variant's value as the value.
 */
export type Flags = Partial<AppFlags>;
/**
 * Accesses the evaluated flags from context.
 *
 * You need to render a <FeatureProvider /> further up to be able to use
 * this component.
 */
export declare function useFlagMap(): Partial<AppFlags>;
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
export declare function FeatureProvider<F extends Flags>(props: {
    value: F;
    children: React.ReactNode;
}): import("react").FunctionComponentElement<import("react").ProviderProps<Partial<AppFlags> | null>>;
//# sourceMappingURL=provider.d.ts.map