"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { FullScreenUpgradeBanner } from "@calcom/web/modules/billing/components/FullScreenUpgradeBanner";

export function FullscreenUpgradeBannerForTeamsPage() {
  const { t } = useLocale();

  const features = [
    t("upgrade_banner_teams_feature1"),
    t("upgrade_banner_teams_feature2"),
    t("upgrade_banner_teams_feature3"),
    t("upgrade_banner_teams_feature4"),
  ];

  return (
    <FullScreenUpgradeBanner
      tracking="fullscreen-upgrade-banner-for-teams-page"
      name={t("upgrade_banner_teams_name")}
      title={t("upgrade_banner_teams_title")}
      subtitle={t("upgrade_banner_teams_subtitle")}
      features={features}
      target="team"
      image={{
        src: "/upgrade/full_teams.png",
        width: 572,
        height: 744,
      }}
      youtubeId="hp-l5oRVD-U"
      learnMoreButton={{
        text: t("learn_more"),
        href: "https://cal.com/teams",
      }}
    />
  );
}
