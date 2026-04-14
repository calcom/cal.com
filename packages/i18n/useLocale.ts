// Re-export shim for consumers using moduleResolution:"node" (e.g. @coss/ui),
// which cannot resolve package.json "exports" maps.
export { useLocale } from "./use-locale";
export type { useLocaleReturnType } from "./use-locale";
