"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/components/icon";
import { UpgradePlanDialog } from "@calcom/web/modules/billing/components/UpgradePlanDialog";
import { WideUpgradeBanner } from "@calcom/web/modules/billing/components/WideUpgradeBanner";
import { Button } from "@coss/ui/components/button";

export function WideUpgradeBannerForBookingAudit() {
  const { t } = useLocale();

  return (
    <WideUpgradeBanner
      tracking="bookings.booking-history-audit-logs"
      title={t("booking_history_requires_organization")}
      subtitle={t("booking_history_upgrade_description")}
      target="organization"
      size="sm"
      dismissible={false}>
      <UpgradePlanDialog tracking="booking-history-audit-logs" target="organization">
        <Button variant="outline">
          {t("try_for_free")}
          <Icon name="arrow-right" />
        </Button>
      </UpgradePlanDialog>
    </WideUpgradeBanner>
  );
}
