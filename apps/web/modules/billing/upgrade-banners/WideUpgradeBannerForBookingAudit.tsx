"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WideUpgradeBanner } from "@calcom/web/modules/billing/components/WideUpgradeBanner";

export function WideUpgradeBannerForBookingAudit() {
  const { t } = useLocale();

  return (
    <WideUpgradeBanner
      size="sm"
      tracking="bookings.booking-history-audit-logs"
      title={t("booking_history_requires_organization")}
      subtitle={t("booking_history_upgrade_description")}
      target="organization"
      dismissible={false}
    />
  );
}
