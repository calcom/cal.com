"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { FullScreenUpgradeBanner } from "@calcom/web/modules/billing/components/FullScreenUpgradeBanner";

export default function FullscreenTeamPlayground() {
  const { t } = useLocale();

  return (
    <FullScreenUpgradeBanner
      tracking="playground.fullscreen-team"
      name="Teams"
      title="Automatically route meetings to your team"
      subtitle="Turn individual scheduling into a system that assigns, distributes, and manages meetings for your team."
      features={[
        "Route inbound requests to the right person",
        "Distribute meetings fairly with round-robin",
        "See what's getting booked (and what's not)",
        "Remove Cal.com branding",
      ]}
      target="team"
      image={{
        src: "/upgrade/full_teams.png",
        width: 572,
        height: 744,
      }}
      learnMoreButton={{
        text: t("learn_more"),
        href: "https://cal.com/teams",
      }}
    />
  );
}
