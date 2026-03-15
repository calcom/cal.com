"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { FullScreenUpgradeBanner } from "@calcom/web/modules/billing/components/FullScreenUpgradeBanner";

export function FullscreenUpgradeBannerForRoutingFormPage() {
  const { t } = useLocale();

  return (
    <FullScreenUpgradeBanner
      tracking="fullscreen-upgrade-banner-for-routing-form-page"
      name={t("upgrade_banner_routing_form_name")}
      title={t("upgrade_banner_routing_form_title")}
      subtitle={t("upgrade_banner_routing_form_subtitle")}
      target="team"
      image={{
        src: "/upgrade/full_insights_routing.png",
        width: 572,
        height: 744,
      }}
      youtubeId="omM89sE7Jpg"
      learnMoreButton={{
        text: t("learn_more"),
        href: "https://cal.com/routing",
      }}
    />
  );
}
