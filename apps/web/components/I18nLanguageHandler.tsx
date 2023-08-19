import { useSession } from "next-auth/react";
import { useTranslation } from "next-i18next";
import { useEffect } from "react";

import { trpc } from "@calcom/trpc/react";

// eslint-disable-next-line turbo/no-undeclared-env-vars
const vercelCommitHash = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "NA";

export function useViewerI18n(locale: string) {
  return trpc.viewer.public.i18n.useQuery(
    { locale, CalComVersion: vercelCommitHash },
    {
      /**
       * i18n should never be clubbed with other queries, so that it's caching can be managed independently.
       **/
      trpc: {
        context: { skipBatch: true },
      },
    }
  );
}

/**
 * Auto-switches locale client-side to the logged in user's preference
 */
const I18nLanguageHandler = () => {
  const session = useSession();
  const { i18n } = useTranslation("common");
  const locale = useViewerI18n(session.data?.user.locale || "en").data?.locale || i18n.language;

  useEffect(() => {
    // bail early when i18n = {}
    if (Object.keys(i18n).length === 0) return;
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
