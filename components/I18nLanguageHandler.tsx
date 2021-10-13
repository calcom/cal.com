import { useTranslation } from "next-i18next";

import { trpc } from "@lib/trpc";

const I18nLanguageHandler = (): null => {
  const { i18n } = useTranslation("common");
  const locale = trpc.useQuery(["viewer.me"]).data?.locale;

  if (locale && i18n.language && i18n.language !== locale) {
    if (typeof i18n.changeLanguage === "function") i18n.changeLanguage(locale);
  }

  return null;
};

export default I18nLanguageHandler;
