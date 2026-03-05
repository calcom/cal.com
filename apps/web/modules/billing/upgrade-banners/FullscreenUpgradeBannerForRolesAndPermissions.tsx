"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { FullScreenUpgradeBanner } from "@calcom/web/modules/billing/components/FullScreenUpgradeBanner";

export function FullscreenUpgradeBannerForRolesAndPermissions() {
  const { t } = useLocale();

  return (
    <FullScreenUpgradeBanner
      tracking="fullscreen-upgrade-banner-for-roles-and-permissions"
      name={t("upgrade_banner_roles_name")}
      title={t("upgrade_banner_roles_title")}
      subtitle={t("upgrade_banner_roles_subtitle")}
      target="organization"
      extraOffset={20}
      image={{
        src: "/upgrade/full_roles.png",
        width: 572,
        height: 744,
      }}
      youtubeId="J8HsK-8W39U"
      learnMoreButton={{
        text: t("learn_more"),
        href: "https://cal.com/blog/role-based-access-control",
      }}
    />
  );
}
