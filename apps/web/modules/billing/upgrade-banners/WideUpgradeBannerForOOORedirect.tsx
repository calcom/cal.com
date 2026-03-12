"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/components/icon";
import { WideUpgradeBanner } from "@calcom/web/modules/billing/components/WideUpgradeBanner";
import { Button } from "@coss/ui/components/button";

export function WideUpgradeBannerForOOORedirect({ onUpgradeClick }: { onUpgradeClick?: () => void }) {
  const { t } = useLocale();

  return (
    <WideUpgradeBanner
      size="sm"
      tracking="settings.ooo-redirect"
      title={t("redirect_team_enabled")}
      target="team"
      dismissible={false}
      button={
        <Button size="sm" variant="outline" onClick={onUpgradeClick}>
          {t("upgrade")}
          <Icon name="arrow-right" />
        </Button>
      }
    />
  );
}
