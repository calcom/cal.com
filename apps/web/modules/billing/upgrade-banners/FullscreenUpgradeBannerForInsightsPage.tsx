"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { FullScreenUpgradeBanner } from "@calcom/web/modules/billing/components/FullScreenUpgradeBanner";

export function FullscreenUpgradeBannerForInsightsPage() {
  const { t } = useLocale();

  const features = [
    t("upgrade_banner_insights_feature1"),
    t("upgrade_banner_insights_feature2"),
    t("upgrade_banner_insights_feature3"),
  ];

  return (
    <FullScreenUpgradeBanner
      tracking="fullscreen-upgrade-banner-for-insights-page"
      name={t("upgrade_banner_insights_name")}
      title={t("upgrade_banner_insights_title")}
      subtitle={t("upgrade_banner_insights_subtitle")}
      features={features}
      target="team"
      image={{
        src: "/upgrade/full_insights.png",
        width: 572,
        height: 744,
      }}
      learnMoreButton={{
        text: t("learn_more"),
        href: "https://cal.com/blog/insight-2-0-calcom-scheduling",
      }}
    />
  );
}
