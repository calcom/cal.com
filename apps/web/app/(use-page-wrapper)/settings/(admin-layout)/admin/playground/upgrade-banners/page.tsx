"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/components/icon";
import { WideUpgradeBanner } from "@calcom/web/modules/billing/components/WideUpgradeBanner";
import Link from "next/link";

const FULLSCREEN_PAGES = [
  {
    title: "Team target with features",
    href: "/settings/admin/playground/upgrade-banners/fullscreen-team",
  },
  {
    title: "Organization target",
    href: "/settings/admin/playground/upgrade-banners/fullscreen-org",
  },
];

export default function UpgradeBannersPlayground() {
  const { t } = useLocale();

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-emphasis text-2xl font-bold">Upgrade Banners</h1>
        <p className="text-default mt-2">Showcase of all upgrade banner variants used across the app.</p>
      </div>

      {/* Wide Upgrade Banner - sm */}
      <section className="space-y-4">
        <h2 className="text-emphasis text-lg font-semibold">WideUpgradeBanner — size=&quot;sm&quot;</h2>
        <p className="text-subtle text-sm">
          Compact banner with button on the right. No image. Used inline alongside feature UI.
        </p>

        <div className="space-y-4">
          <h3 className="text-default text-sm font-medium">Dismissible (default)</h3>
          <WideUpgradeBanner
            size="sm"
            tracking="playground.wide-sm-dismissible"
            title="Customize locations per host"
            subtitle="Let each host set their own meeting location so bookings always happen in the right place."
            target="organization"
          />

          <h3 className="text-default text-sm font-medium">Non-dismissible</h3>
          <WideUpgradeBanner
            size="sm"
            tracking="playground.wide-sm-non-dismissible"
            title="Enable instant meetings"
            subtitle="Let prospects join a call immediately instead of waiting for a scheduled time."
            target="organization"
            dismissible={false}
          />

          <h3 className="text-default text-sm font-medium">Team target</h3>
          <WideUpgradeBanner
            size="sm"
            tracking="playground.wide-sm-team"
            title="Access meeting recordings"
            subtitle="Download and review recordings of your Cal Video meetings."
            target="team"
            dismissible={false}
          />

          <h3 className="text-default text-sm font-medium">Without badge</h3>
          <WideUpgradeBanner
            size="sm"
            tracking="playground.wide-sm-no-badge"
            title="It looks like you're on a work email"
            subtitle="Organize events across your team and make sure every meeting lands with the right person."
            target="organization"
            showBadge={false}
          />
        </div>
      </section>

      {/* Wide Upgrade Banner - md */}
      <section className="space-y-4">
        <h2 className="text-emphasis text-lg font-semibold">
          WideUpgradeBanner — size=&quot;md&quot; (default)
        </h2>
        <p className="text-subtle text-sm">
          Full-width banner with button below text and image on the right. Used for prominent upsells.
        </p>

        <WideUpgradeBanner
          tracking="playground.wide-md"
          title="Route meetings based on team member attributes"
          subtitle="Define attributes like role, region, or specialty and use them to route bookings to the right people automatically."
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
      </section>

      {/* Full Screen Upgrade Banner - links to sub-pages */}
      <section className="space-y-4">
        <h2 className="text-emphasis text-lg font-semibold">FullScreenUpgradeBanner</h2>
        <p className="text-subtle text-sm">
          Full-height banner that fills the remaining viewport. Used as the main content on gated pages. Each
          variant opens in its own page.
        </p>

        <div className="bg-default border-subtle divide-subtle flex flex-col divide-y rounded-md border">
          {FULLSCREEN_PAGES.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="hover:bg-muted group flex items-center justify-between p-4 transition-colors">
              <span className="text-emphasis text-sm font-medium">{page.title}</span>
              <Icon
                name="arrow-right"
                className="text-subtle group-hover:text-emphasis h-4 w-4 transition-colors"
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
