"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WideUpgradeBanner } from "@calcom/web/modules/billing/components/WideUpgradeBanner";

export function WideUpgradeBannerForRedirectUrl() {
  const { t } = useLocale();

  return (
    <WideUpgradeBanner
      size="sm"
      tracking="event-types.redirect-url"
      title={t("redirect_success_booking")}
      subtitle={t("redirect_url_description")}
      target="team"
      dismissible={false}
    />
  );
}
