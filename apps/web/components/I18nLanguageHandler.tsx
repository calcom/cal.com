import { isEmpty } from "lodash";
import type { I18n } from "next-i18next";
import { useTranslation } from "next-i18next";
import { useEffect } from "react";

import { trpc } from "@calcom/trpc/react";

import useLocalStorage from "@lib/hooks/useLocalStorage";

type I18nObj = {
  i18n: I18n;
  locale: string;
};

export function useViewerI18n(): I18nObj | undefined {
  // We'll cache i18nData via localStorage, so users who have visited before will see their previous locale data whilst
  // the request for their latest i18n info is processing
  const [I18nData, setI18nData] = useLocalStorage<I18nObj | undefined>("i18nData", undefined);

  const query = trpc.viewer.public.i18n.useQuery(undefined, {
    staleTime: Infinity,
    /**
     * i18n should never be clubbed with other queries, so that it's caching can be managed independently.
     */
    trpc: {
      context: { skipBatch: true },
    },
  });

  // If trpc state is hydrated from a server-side render
  useEffect(() => {
    setI18nData(query.data);
  }, [setI18nData, query.data]);

  return I18nData;
}

/**
 * Auto-switches locale client-side to the logged in user's preference
 */
const I18nLanguageHandler = (): null => {
  const { i18n } = useTranslation("common");
  const locale = useViewerI18n()?.locale || i18n.language;

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
