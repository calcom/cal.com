import { useTranslation } from "next-i18next";
import { useEffect } from "react";

import { trpc } from "@lib/trpc";

export function useViewerI18n() {
  return trpc.useQuery(["viewer.i18n"], {
    staleTime: Infinity,
  });
}

/**
 * Auto-switches locale client-side to the logged in user's preference
 */
const I18nLanguageHandler = (): null => {
  const { i18n } = useTranslation("common");
  const locale = useViewerI18n().data?.locale;

  useEffect(() => {
    if (locale && i18n.language && i18n.language !== locale) {
      if (typeof i18n.changeLanguage === "function") i18n.changeLanguage(locale);
    }
  }, [locale, i18n]);

  return null;
};

export default I18nLanguageHandler;
