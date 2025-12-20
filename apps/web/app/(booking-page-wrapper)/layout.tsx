import { headers, cookies } from "next/headers";

import { getLocale } from "@calcom/features/auth/lib/getLocale";
import { loadTranslations } from "@calcom/lib/server/i18n";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import PageWrapper from "@components/PageWrapperAppDir";

import { CustomI18nProvider } from "../CustomI18nProvider";

export default async function BookingPageWrapperLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const nonce = h.get("x-csp-nonce") ?? undefined;

  // Load booking-specific translations (smaller payload than common.json)
  const locale = (await getLocale(buildLegacyRequest(await headers(), await cookies()))) ?? "en";
  const ns = "booking";
  const translations = await loadTranslations(locale, ns);

  return (
    <>
      <CustomI18nProvider translations={translations} locale={locale} ns={ns}>
        <PageWrapper isBookingPage={true} requiresLicense={false} nonce={nonce}>
          {children}
        </PageWrapper>
      </CustomI18nProvider>
    </>
  );
}
