import type { useLocaleReturnType } from "@calcom/i18n/useLocale";
import { useLocale as useBaseLocale } from "@calcom/i18n/useLocale";
import { useAtomsContext } from "./useAtomsContext";

export const useAtomsLocale = (): useLocaleReturnType => {
  const context = useAtomsContext();
  const base = useBaseLocale();
  if (context?.clientId) {
    return { i18n: context.i18n, t: context.t, isLocaleReady: true } as unknown as useLocaleReturnType;
  }
  return base;
};
