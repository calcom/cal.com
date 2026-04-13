/**
 * Compatibility shim — re-exports useLocale from @calcom/i18n.
 *
 * The canonical implementation now lives in `packages/i18n/use-locale.ts`.
 * This file keeps the old `@calcom/lib/hooks/useLocale` import path working
 * while consumers are being migrated.  Once every consumer has been updated,
 * this file can be deleted.
 *
 * Platform atoms still need the `useAtomsContext` override, so we preserve
 * that check here until they migrate to `useAtomsLocale`.
 */
import { useAtomsContext } from "@calcom/atoms/hooks/useAtomsContext";
import type { useLocaleReturnType } from "@calcom/i18n/use-locale";
import { useLocale as useBaseLocale } from "@calcom/i18n/use-locale";

export type { useLocaleReturnType } from "@calcom/i18n/use-locale";

export const useLocale = (
  namespace?: Parameters<typeof useBaseLocale>[0]
): useLocaleReturnType => {
  const context = useAtomsContext();
  const base = useBaseLocale(namespace);

  if (context?.clientId) {
    return { i18n: context.i18n, t: context.t, isLocaleReady: true } as unknown as useLocaleReturnType;
  }

  return base;
};
