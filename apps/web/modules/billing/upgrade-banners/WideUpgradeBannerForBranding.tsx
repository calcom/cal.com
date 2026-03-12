"use client";

import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WideUpgradeBanner } from "@calcom/web/modules/billing/components/WideUpgradeBanner";

export function WideUpgradeBannerForBranding() {
  const { t } = useLocale();

  return (
    <WideUpgradeBanner
      size="sm"
      tracking="settings.disable-branding"
      title={t("disable_cal_branding", { appName: APP_NAME })}
      subtitle={t("removes_cal_branding", { appName: APP_NAME })}
      target="team"
      dismissible={false}
    />
  );
}
