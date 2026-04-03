"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WideUpgradeBanner } from "@calcom/web/modules/billing/components/wide-upgrade-banner";

export function WideUpgradeBannerForMembers() {
  const { t } = useLocale();

  return (
    <WideUpgradeBanner
      tracking="large-upgrade-banner-for-members"
      title={t("upgrade_banner_team_attributes_title")}
      subtitle={t("upgrade_banner_team_attributes_subtitle")}
      target="organization"
      button={t("try_for_free")}
      image="/upgrade/large_members.png"
      learnMoreButton={{
        text: t("learn_more"),
        href: "https://cal.com/help/routing/routing-with-attributes",
      }}
    />
  );
}
