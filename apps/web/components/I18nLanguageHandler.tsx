import { useTranslation } from "next-i18next";
import { useEffect } from "react";

import { getDirFromLang } from "@calcom/lib/i18n";
import { trpc } from "@calcom/trpc/react";

export function useViewerI18n() {
  return trpc.viewer.public.i18n.useQuery(undefined, {
    staleTime: Infinity,
    /**
     * i18n should never be clubbed with other queries, so that it's caching can be managed independently.
     * We intend to not cache i18n query
     **/
    trpc: {
      context: { skipBatch: true },
    },
  });
}

/**
 * Auto-switches locale client-side to the logged in user's preference
 */
const I18nLanguageHandler = (): null => {
  const { i18n } = useTranslation("common");
  const locale = useViewerI18n().data?.locale || "en";

  useEffect(() => {
    if (locale && i18n.language && i18n.language !== locale) {
      if (typeof i18n.changeLanguage === "function") i18n.changeLanguage(locale);
    }

    const dir = getDirFromLang(locale);
    document.documentElement.setAttribute("lang", locale);
    document.documentElement.setAttribute("dir", dir);
  }, [locale, i18n]);

  return null;
};

export default I18nLanguageHandler;
