import { useQuery } from "@tanstack/react-query";
import { isEmpty } from "lodash";
import type { SSRConfig } from "next-i18next";
import { useTranslation } from "next-i18next";
import { useEffect } from "react";

export function useViewerI18n() {
  const { data } = useQuery<{ locale: string }>({
    queryKey: ["locale-key"],
    queryFn: async () => {
      const req = await fetch("/api/get-locale");
      return req.json();
    },
    staleTime: Infinity,
  });

  return useQuery<{ locale: string; i18n: SSRConfig }>({
    queryKey: ["i18n"],
    queryFn: async () => {
      const req = await fetch(`/api/i18n?lang=${data?.locale}`);
      return req.json();
    },
    staleTime: Infinity,
    enabled: typeof data !== "undefined",
  });
}

/**
 * Auto-switches locale client-side to the logged in user's preference
 */
const I18nLanguageHandler = (): null => {
  const { i18n } = useTranslation("common");
  const locale = useViewerI18n().data?.locale || i18n.language;

  useEffect(() => {
    // bail early when i18n = {}
    if (isEmpty(i18n)) return;
    // if locale is ready and the i18n.language does != locale - changeLanguage
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
    // set dir="rtl|ltr"
    document.dir = i18n.dir();
    document.documentElement.setAttribute("lang", locale);
  }, [locale, i18n]);

  return null;
};

export default I18nLanguageHandler;
