"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/components/icon";
import { UpgradePlanDialog } from "@calcom/web/modules/billing/components/UpgradePlanDialog";
import { WideUpgradeBanner } from "@calcom/web/modules/billing/components/WideUpgradeBanner";
import { Button } from "@coss/ui/components/button";

export function WideUpgradeBannerForMembers() {
  const { t } = useLocale();

  return (
    <WideUpgradeBanner
      tracking="large-upgrade-banner-for-members"
      title={t("upgrade_banner_team_attributes_title")}
      subtitle={t("upgrade_banner_team_attributes_subtitle")}
      target="organization"
      image={{
        src: "/upgrade/large_members.png",
        width: 1010,
        height: 340,
      }}
      learnMoreButton={{
        text: t("learn_more"),
        href: "https://cal.com/help/routing/routing-with-attributes",
      }}>
      <UpgradePlanDialog tracking="members" target="organization">
        <Button variant="outline">
          {t("try_for_free")}
          <Icon name="arrow-right" />
        </Button>
      </UpgradePlanDialog>
    </WideUpgradeBanner>
  );
}
