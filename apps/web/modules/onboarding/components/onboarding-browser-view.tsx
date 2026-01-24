"use client";

import classNames from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { subdomainSuffix } from "@calcom/features/ee/organizations/lib/orgDomains";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Icon, type IconName } from "@calcom/ui/components/icon";

type OnboardingBrowserViewProps = {
  avatar?: string | null;
  name?: string;
  bio?: string;
  username?: string | null;
  teamSlug?: string;
};

const getDisplayUrl = (
  orgSlug: string | null | undefined,
  username: string | null | undefined,
  teamSlug: string | undefined
): string => {
  if (orgSlug) {
    return teamSlug !== undefined
      ? `${orgSlug}.${subdomainSuffix()}/team/${teamSlug || ""}`
      : `${orgSlug}.${subdomainSuffix()}/${username || ""}`;
  }

  const webappUrl = WEBAPP_URL.replace(/^https?:\/\//, "");
  return teamSlug !== undefined ? `${webappUrl}/team/${teamSlug || ""}` : `${webappUrl}/${username || ""}`;
};

export const OnboardingBrowserView = ({
  avatar,
  name,
  bio,
  username,
  teamSlug,
}: OnboardingBrowserViewProps) => {
  const { t } = useLocale();
  const pathname = usePathname();
  const orgBranding = useOrgBranding();

  const displayUrl = getDisplayUrl(orgBranding?.slug, username, teamSlug);

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
    {
      title: t("onboarding_browser_view_ask_question"),
      description: t("onboarding_browser_view_ask_question_description"),
      duration: 15,
      icon: "message-circle",
    },
  ];
  return (
    <div className="bg-default border-subtle hidden h-full w-full flex-col overflow-hidden rounded-l-2xl border-y border-s xl:flex">
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
            {/* Profile Header */}
            <div className="border-subtle flex flex-col gap-4 border-b p-4">
              <div className="flex flex-col items-start gap-4">
                <Avatar
                  size="lg"
                  imageSrc={avatar || undefined}
                  alt={name || ""}
                  className="border-2 border-white"
                />
                <div className="flex w-full flex-col gap-2">
                  <h2 className="text-emphasis w-full truncate text-xl font-semibold leading-tight">
                    {name || t("your_name")}
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
            </div>

            {/* Events List */}
            <div className="flex flex-col overflow-y-auto">
              {events.map((event, index) => (
                <div key={event.title} className="opacity-30">
                  {index > 0 && <div className="border-subtle h-px border-t" />}
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
                    <Button color="secondary" size="sm" EndIcon="arrow-right" tabIndex={-1}>
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
