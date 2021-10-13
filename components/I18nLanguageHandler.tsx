import { useTranslation } from "next-i18next";
import { useEffect } from "react";

import { trpc } from "@lib/trpc";

/**
 * Auto-switches locale client-side to the logged in user's preference
 */
const I18nLanguageHandler = (): null => {
  const { i18n } = useTranslation("common");
  const locale = trpc.useQuery(["viewer.me"]).data?.locale;

  useEffect(() => {
    if (locale && i18n.language && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [i18n, locale, i18n.language]);

  return null;
};

export default I18nLanguageHandler;
