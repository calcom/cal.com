"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  EllipsisVerticalIcon,
  LockIcon,
  RotateCwIcon,
  UserPlusIcon,
} from "@coss/ui/icons";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

type MigratedMember = {
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  teamId: number;
  teamName?: string;
};

type OnboardingMigrateMembersBrowserViewProps = {
  members: MigratedMember[];
  organizationLogo?: string | null;
  organizationName?: string;
  organizationBanner?: string | null;
  slug?: string;
};

export const OnboardingMigrateMembersBrowserView = ({
  members,
  organizationLogo,
  organizationName,
  organizationBanner,
  slug,
}: OnboardingMigrateMembersBrowserViewProps) => {
  const pathname = usePathname();
  const { t } = useLocale();
  const displayUrl = slug ? `${slug}.${""}` : "";

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

  const hasMembers = members.length > 0;

  return (
    <div className="hidden h-full w-full flex-col overflow-hidden rounded-l-2xl border-subtle border-y border-s bg-default xl:flex">
      {/* Browser header */}
      <div className="flex min-w-0 shrink-0 items-center gap-3 rounded-t-2xl border-subtle border-b bg-default p-3">
        {/* Navigation buttons */}
        <div className="flex shrink-0 items-center gap-4 opacity-50">
          <ArrowLeftIcon className="h-4 w-4 text-subtle" />
          <ArrowRightIcon className="h-4 w-4 text-subtle" />
          <RotateCwIcon className="h-4 w-4 text-subtle" />
        </div>
        <div className="flex w-full min-w-0 items-center gap-2 rounded-[32px] bg-cal-muted px-3 py-2">
          <LockIcon className="h-4 w-4 text-subtle" />
          <p className="truncate font-medium text-default text-sm leading-tight">{displayUrl}/members</p>
        </div>
        <EllipsisVerticalIcon className="h-4 w-4 text-subtle" />
      </div>

      {/* Content */}
      <div className="h-full bg-cal-muted pt-11 pl-11">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            className="flex h-full w-full flex-col overflow-hidden rounded-tl-xl border border-muted bg-default"
            variants={containerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{
              duration: 0.5,
              ease: "backOut",
            }}>
            {/* Members Header with Banner */}
            <div className="flex flex-col border-subtle border-b">
              <div className="relative">
                {/* Banner Image */}
                <div className="relative h-40 w-full overflow-hidden border-subtle border-b">
                  {organizationBanner ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={organizationBanner}
                      alt={organizationName || ""}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-emphasis" />
                  )}
                </div>

                {/* Organization Logo - Overlaying the banner */}
                {organizationLogo && (
                  <div className="absolute -bottom-8 left-4">
                    <Avatar
                      size="lg"
                      imageSrc={organizationLogo}
                      alt={organizationName || ""}
                      className="border-4 border-white"
                    />
                  </div>
                )}
              </div>

              {/* Members Info */}
              <div className="flex flex-col gap-2 px-4 pt-12 pb-4">
                <h2 className="font-semibold text-emphasis text-xl leading-tight">{t("members")}</h2>
                {hasMembers && (
                  <p className="font-medium text-sm text-subtle leading-tight">
                    {members.length === 1
                      ? t("migrating_members_count", { count: members.length })
                      : t("migrating_members_count_plural", { count: members.length })}
                  </p>
                )}
              </div>
            </div>

            {/* Members List */}
            <div className="flex flex-col overflow-y-auto">
              {hasMembers ? (
                members.map((member, index) => (
                  <div key={member.email}>
                    {index > 0 && <div className="h-px border-subtle border-t" />}
                    <div className="flex items-center gap-3 px-5 py-4">
                      <Avatar
                        size="md"
                        alt={member.name || member.email}
                        imageSrc={member.avatarUrl || undefined}
                        className="border-2 border-white"
                        fallback={
                          <div className="flex h-full w-full items-center justify-center bg-emphasis text-white">
                            <span className="font-semibold text-sm">
                              {(member.name || member.email).charAt(0).toUpperCase()}
                            </span>
                          </div>
                        }
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm text-subtle leading-none">
                            {member.name || member.email}
                          </h3>
                          <Badge variant="green" className="text-xs">
                            {t("migrating")}
                          </Badge>
                        </div>
                        <p className="font-medium text-muted text-xs leading-tight">{member.email}</p>
                      </div>
                      <CheckIcon className="h-5 w-5 text-emphasis" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 px-5 py-12">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cal-muted">
                    <UserPlusIcon className="h-8 w-8 text-subtle" />
                  </div>
                  <div className="flex flex-col gap-1 text-center">
                    <p className="truncate font-semibold text-default text-sm leading-tight">
                      {t("no_members_to_migrate")}
                    </p>
                    <p className="truncate font-medium text-subtle text-xs leading-tight">
                      {t("members_will_be_added_to_organization")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
