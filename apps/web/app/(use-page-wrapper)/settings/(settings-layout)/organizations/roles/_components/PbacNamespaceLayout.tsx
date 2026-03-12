import { getLocale } from "@calcom/features/auth/lib/getLocale";
import { loadTranslations } from "@calcom/i18n/server";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { I18nExtend } from "app/I18nProvider";
import { cookies, headers } from "next/headers";

/**
 * Server component that loads the "pbac" namespace translations for the user's locale.
 * getLocale is needed here because React context (I18nProvider) is not available in server components.
 * On the client side, I18nExtend merges these translations on top of the parent context's
 * common translations and inherits the locale from the root I18nProvider.
 */
export default async function PbacNamespaceLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale(buildLegacyRequest(await headers(), await cookies()))) ?? "en";
  const translations = await loadTranslations(locale, "pbac");

  return (
    <I18nExtend translations={translations} ns="pbac">
      {children}
    </I18nExtend>
  );
}
