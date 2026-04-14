"use client";

import { useLocale } from "@calcom/i18n/useLocale";
import { WideUpgradeBanner } from "@calcom/web/modules/billing/components/wide-upgrade-banner";

export function WideUpgradeBannerForHostLocations() {
  const { t } = useLocale();

  return (
    <WideUpgradeBanner
      size="sm"
      tracking="event-types.host-locations"
      title={t("enable_custom_host_locations")}
      subtitle={t("enable_custom_host_locations_description")}
      target="organization"
      dismissible={false}
    />
  );
}
