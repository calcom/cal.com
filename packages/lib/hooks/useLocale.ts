import { createInstance } from "i18next";
import i18next, { type TFunction } from "i18next";
import { useContext } from "react";
import { useTranslation, initReactI18next } from "react-i18next";

import { useAtomsContext } from "@calcom/atoms/hooks/useAtomsContext";
import { AppRouterI18nContext } from "@calcom/web/app/AppRouterI18nProvider";
import { CustomI18nContext } from "@calcom/web/app/CustomI18nProvider";

/* eslint-disable @typescript-eslint/no-var-requires */
const { i18n: config } = require("@calcom/config/next-i18next.config");

// Initialize global i18next instance if not already initialized
if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({
    lng: config?.defaultLocale || "en",
    fallbackLng: "en",
    debug: process.env.NODE_ENV === "development",

    interpolation: {
      escapeValue: false,
    },

    resources: {
      // Start with empty resources, will be populated dynamically
    },

    react: {
      useSuspense: false,
    },

    ns: ["common"],
    defaultNS: "common",
  });
}

type useLocaleReturnType = {
  i18n: typeof i18next;
  t: TFunction;
  isLocaleReady: boolean;
};

// @internal
const useClientLocale = (namespace: Parameters<typeof useTranslation>[0] = "common"): useLocaleReturnType => {
  const context = useAtomsContext();
  const { i18n, t } = useTranslation(namespace);
  const isLocaleReady = Object.keys(i18n).length > 0;
  if (context?.clientId) {
    return { i18n: context.i18n, t: context.t, isLocaleReady: true } as unknown as useLocaleReturnType;
  }
  return {
    i18n,
    t,
    isLocaleReady,
  };
};

// @internal
const serverI18nInstances = new Map();

export const useLocale = (): useLocaleReturnType => {
  const appRouterContext = useContext(AppRouterI18nContext);
  const customI18nContext = useContext(CustomI18nContext);
  const clientI18n = useClientLocale();

  if (appRouterContext) {
    const { translations, locale, ns } = customI18nContext ?? appRouterContext;
    const instanceKey = `${locale}-${ns}`;

    // Check if we already have an instance for this locale and namespace
    if (!serverI18nInstances.has(instanceKey)) {
      const i18n = createInstance();

      i18n.use(initReactI18next);

      i18n.init({
        lng: locale,
        resources: {
          [locale]: {
            [ns]: translations,
          },
        },
        interpolation: {
          escapeValue: false,
        },
      });

      serverI18nInstances.set(instanceKey, {
        t: i18n.getFixedT(locale, ns),
        isLocaleReady: true,
        i18n,
      });
    }

    return serverI18nInstances.get(instanceKey);
  }

  console.warn(
    "useLocale hook is being used outside of App Router - hence this hook will use a global, client-side i18n which can cause a small flicker"
  );
  return {
    t: clientI18n.t,
    isLocaleReady: clientI18n.isLocaleReady,
    i18n: clientI18n.i18n,
  };
};
