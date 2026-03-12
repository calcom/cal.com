"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WideUpgradeBanner } from "@calcom/web/modules/billing/components/WideUpgradeBanner";

export function WideUpgradeBannerForMembers() {
  const { t } = useLocale();

  return (
    <WideUpgradeBanner
      tracking="large-upgrade-banner-for-members"
      title={t("upgrade_banner_team_attributes_title")}
      subtitle={t("upgrade_banner_team_attributes_subtitle")}
      target="organization"
      button={t("try_for_free")}
      image={{
        src: "/upgrade/large_members.png",
        width: 1010,
        height: 340,
      }}
      learnMoreButton={{
        text: t("learn_more"),
        href: "https://cal.com/help/routing/routing-with-attributes",
      }}
    />
  );
}
