"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WideUpgradeBanner } from "@calcom/web/modules/billing/components/WideUpgradeBanner";

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
