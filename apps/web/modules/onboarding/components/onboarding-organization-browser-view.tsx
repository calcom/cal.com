"use client";

import classNames from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { subdomainSuffix } from "@calcom/features/ee/organizations/lib/orgDomains";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Icon, type IconName } from "@calcom/ui/components/icon";

// Helper function to darken a hex color
const darkenColor = (hex: string, amount: number): string => {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.min(255, (num & 0xff) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
};

type OnboardingOrganizationBrowserViewProps = {
  avatar?: string | null;
  name?: string;
  bio?: string;
  slug?: string;
  bannerUrl?: string | null;
  brandColor?: string;
};

export const OnboardingOrganizationBrowserView = ({
  avatar,
  name,
  bio,
  slug,
  bannerUrl,
  brandColor,
}: OnboardingOrganizationBrowserViewProps) => {
  const { t } = useLocale();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const displayUrl = slug ? `${slug}.${subdomainSuffix()}` : subdomainSuffix();

  // Update CSS variables when brandColor changes
  useEffect(() => {
    if (brandColor && containerRef.current) {
      containerRef.current.style.setProperty("--cal-brand", brandColor);
      // Set brand-emphasis as a slightly darker version for hover states
      const darkerColor = darkenColor(brandColor, 0.1);
      containerRef.current.style.setProperty("--cal-brand-emphasis", darkerColor);
    }
  }, [brandColor]);

  // Animation variants for entry and exit
  const containerVariants = {
    initial: {
      opacity: 0,
      y: -20,
    },
    animate: {
      opacity: 1,
      y: 0,
    },
    exit: {
      opacity: 0,
      y: 20,
    },
  };

  const events: Array<{
    title: string;
    description: string;
    duration: number;
    icon: IconName;
  }> = [
    {
      title: t("onboarding_browser_view_demo"),
      description: t("onboarding_browser_view_demo_description"),
      duration: 15,
      icon: "bell",
    },
    {
      title: t("onboarding_browser_view_quick_meeting"),
      description: t("onboarding_browser_view_quick_meeting_description"),
      duration: 15,
      icon: "bell",
    },
    {
      title: t("onboarding_browser_view_longer_meeting"),
      description: t("onboarding_browser_view_longer_meeting_description"),
      duration: 30,
      icon: "clock",
    },
    {
      title: t("in_person_meeting"),
      description: t("onboarding_browser_view_in_person_description"),
      duration: 120,
      icon: "map-pin",
    },
  ];

  return (
    <div
      ref={containerRef}
      className="bg-default border-subtle hidden h-full w-full flex-col overflow-hidden rounded-l-2xl border-y border-s xl:flex">
      {/* Browser header */}
      <div className="border-subtle bg-default flex min-w-0 shrink-0 items-center gap-3 rounded-t-2xl border-b p-3">
        {/* Navigation buttons */}
        <div className="flex shrink-0 items-center gap-4 opacity-50">
          <Icon name="arrow-left" className="text-subtle h-4 w-4" />
          <Icon name="arrow-right" className="text-subtle h-4 w-4" />
          <Icon name="rotate-cw" className="text-subtle h-4 w-4" />
        </div>
        <div className="bg-cal-muted flex w-full min-w-0 items-center gap-2 rounded-[32px] px-3 py-2">
          <Icon name="lock" className="text-subtle h-4 w-4" />
          <p className="text-default truncate text-sm font-medium leading-tight">{displayUrl}</p>
        </div>
        <Icon name="ellipsis-vertical" className="text-subtle h-4 w-4" />
      </div>
      {/* Content */}
      <div className="bg-cal-muted h-full pl-11 pt-11">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            className="bg-default border-muted flex h-full w-full flex-col overflow-hidden rounded-l-xl border-y border-s"
            variants={containerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{
              duration: 0.5,
              ease: "backOut",
            }}>
            {/* Organization Profile Header with Banner */}
            <div className="border-subtle flex flex-col border-b">
              <div className="relative">
                {/* Banner Image */}
                <div className="border-subtle relative h-36 w-full overflow-hidden border-b">
                  {bannerUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={bannerUrl} alt={name || ""} className="h-full w-full object-cover" />
                  ) : (
                    <div className="bg-emphasis h-full w-full" />
                  )}
                </div>

                {/* Organization Avatar - Overlaying the banner */}
                <div className="absolute -bottom-8 left-4">
                  <Avatar
                    size="lg"
                    imageSrc={avatar || undefined}
                    alt={name || ""}
                    className="border-4 border-white"
                  />
                </div>
              </div>

              {/* Organization Info */}
              <div className="flex flex-col gap-2 px-4 pb-4 pt-12">
                <h2 className="text-emphasis truncate text-xl font-semibold leading-tight">
                  {name || t("organization_name")}
                </h2>
                <p
                  className={classNames("text-sm leading-normal", {
                    "text-default": bio,
                    "text-subtle italic": !bio,
                  })}>
                  {bio || t("onboarding_browser_view_default_bio")}
                </p>
              </div>
            </div>

            {/* Events List */}
            <div className="flex flex-col overflow-y-hidden">
              {events.map((event) => (
                <div key={event.title} className="border opacity-30 first:border-t-0">
                  <div className="flex items-center justify-between gap-3 px-5 py-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <h3 className="text-default text-sm font-semibold leading-none">{event.title}</h3>
                        <div className="bg-emphasis flex h-4 items-center justify-center gap-1 rounded-md px-1">
                          <Icon name={event.icon} className="text-emphasis h-3 w-3" />
                          <span className="text-emphasis text-xs font-medium leading-none">
                            {event.duration} {t("minute_timeUnit")}
                          </span>
                        </div>
                      </div>
                      <p className="text-subtle text-sm font-medium leading-tight">{event.description}</p>
                    </div>
                    <Button color="primary" size="sm" EndIcon="arrow-right" tabIndex={-1}>
                      {t("book_now")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
