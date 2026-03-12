"use client";

import { FullScreenUpgradeBanner } from "@calcom/web/modules/billing/components/FullScreenUpgradeBanner";

export default function FullscreenOrgPlayground() {
  return (
    <FullScreenUpgradeBanner
      tracking="playground.fullscreen-org"
      name="Insights"
      title="See what's getting booked, and what's not"
      subtitle="Turn booking data into clarity for you and your team so you can spot gaps, balance workload, and make better scheduling decisions."
      features={[
        "Understand booking volume and cancellations",
        "See how meetings are distributed across team members",
        "Spot trends that help you improve availability and routing",
      ]}
      target="organization"
      image={{
        src: "/upgrade/full_teams.png",
        width: 572,
        height: 744,
      }}
    />
  );
}
