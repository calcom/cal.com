import { createInstance } from "i18next";
import { useContext } from "react";
import { useTranslation } from "react-i18next";

import { useAtomsContext } from "@calcom/atoms/hooks/useAtomsContext";
import { AppRouterI18nContext } from "@calcom/web/app/AppRouterI18nProvider";

// `useClientLocale` is NOT MEANT TO BE EXPORTED
// @internal
const useClientLocale = (namespace: Parameters<typeof useTranslation>[0] = "common") => {
  const context = useAtomsContext();
  const { i18n, t } = useTranslation(namespace);
  const isLocaleReady = Object.keys(i18n).length > 0;
  if (context?.clientId) {
    return { i18n: context.i18n, t: context.t, isLocaleReady: true } as unknown as {
      i18n: ReturnType<typeof useTranslation>["i18n"];
      t: ReturnType<typeof useTranslation>["t"];
      isLocaleReady: boolean;
    };
  }
  return {
    i18n,
    t,
    isLocaleReady,
  };
};

export const useLocale = () => {
  const appRouterContext = useContext(AppRouterI18nContext);
  const clientSideI18n = useClientLocale();

  if (appRouterContext) {
    const { translations, locale, ns } = appRouterContext;
    const i18n = createInstance();
    i18n.init({
      lng: locale,
      resources: {
        [locale]: {
          [ns]: translations,
        },
      },
      fallbackLng: "en",
    });

    return { t: i18n.getFixedT(locale, ns), isLocaleReady: true, locale };
  }

  console.warn(
    "useT hook is being used outside of App Router - hence this hook will use a global, client-side i18n which can cause a small flicker"
  );
  return {
    t: clientSideI18n.t,
    isLocaleReady: clientSideI18n.isLocaleReady,
    locale: clientSideI18n.i18n.language,
  };
};
