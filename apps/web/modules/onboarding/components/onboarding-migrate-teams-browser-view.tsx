"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

import { subdomainSuffix } from "@calcom/features/ee/organizations/lib/orgDomains";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Icon } from "@calcom/ui/components/icon";

type OnboardingMigrateTeamsBrowserViewProps = {
  teams: Array<{ id: number; name: string; slug: string | null; isSelected?: boolean }>;
  organizationLogo?: string | null;
  organizationName?: string;
  organizationBanner?: string | null;
  slug?: string;
};

export const OnboardingMigrateTeamsBrowserView = ({
  teams,
  organizationLogo,
  organizationName,
  organizationBanner,
  slug,
}: OnboardingMigrateTeamsBrowserViewProps) => {
  const pathname = usePathname();
  const { t } = useLocale();
  const displayUrl = slug ? `${slug}.${subdomainSuffix()}` : subdomainSuffix();

  const selectedTeams = teams.filter((team) => team.isSelected);
  const hasValidTeams = teams.length > 0;

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
          <p className="text-default truncate text-sm font-medium leading-tight">{displayUrl}/teams</p>
        </div>
        <Icon name="ellipsis-vertical" className="text-subtle h-4 w-4" />
      </div>

      {/* Content */}
      <div className="bg-cal-muted h-full pl-11 pt-11">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            className="bg-default border-muted flex h-full w-full flex-col overflow-hidden rounded-tl-xl border"
            variants={containerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{
              duration: 0.5,
              ease: "backOut",
            }}>
            {/* Teams Header with Banner */}
            <div className="border-subtle flex flex-col border-b">
              <div className="relative">
                {/* Banner Image */}
                <div className="border-subtle relative h-40 w-full overflow-hidden border-b">
                  {organizationBanner ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={organizationBanner}
                      alt={organizationName || ""}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="bg-emphasis h-full w-full" />
                  )}
                </div>

                {/* Organization Logo - Overlaying the banner */}
                {organizationLogo && (
                  <div className="absolute -bottom-8 left-4">
                    <Avatar
                      size="lg"
                      imageSrc={organizationLogo}
                      alt={organizationName || ""}
                      className="border-default border-4"
                    />
                  </div>
                )}
              </div>

              {/* Teams Info */}
              <div className="flex flex-col gap-2 px-4 pb-4 pt-12">
                <h2 className="text-emphasis text-xl font-semibold leading-tight">{t("teams")}</h2>
                {selectedTeams.length > 0 && (
                  <p className="text-subtle text-sm font-medium leading-tight">
                    {selectedTeams.length === 1
                      ? t("migrating_teams_count", { count: selectedTeams.length })
                      : t("migrating_teams_count_plural", { count: selectedTeams.length })}
                  </p>
                )}
              </div>
            </div>

            {/* Teams List */}
            <div className="flex flex-col overflow-y-auto">
              {hasValidTeams ? (
                <>
                  {teams.map((team, index) => (
                    <div key={team.id}>
                      {index > 0 && <div className="border-subtle h-px border-t" />}
                      <div className="flex items-center gap-3 px-5 py-4">
                        <Avatar
                          size="md"
                          alt={team.name}
                          className="border-default border-2"
                          fallback={
                            <div className="bg-emphasis flex h-full w-full items-center justify-center text-white">
                              <span className="text-sm font-semibold uppercase">{team.name.charAt(0)}</span>
                            </div>
                          }
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <h3 className="text-subtle line-clamp-1 min-w-0 truncate text-sm font-semibold leading-none">
                              {team.name}
                            </h3>
                            {team.isSelected && (
                              <Badge variant="green" className="shrink-0 text-xs">
                                {t("migrating")}
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted text-xs font-medium leading-tight">
                            {team.slug && slug
                              ? `${slug}.${subdomainSuffix()}/${team.slug}`
                              : team.slug
                                ? `${team.slug}.${subdomainSuffix()}`
                                : t("team_slug_pending")}
                          </p>
                        </div>
                        {team.isSelected ? (
                          <Icon name="check" className="text-emphasis h-5 w-5" />
                        ) : (
                          <Icon name="arrow-right" className="text-subtle h-4 w-4" />
                        )}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 px-5 py-12">
                  <div className="bg-cal-muted flex h-16 w-16 items-center justify-center rounded-full">
                    <Icon name="users" className="text-subtle h-8 w-8" />
                  </div>
                  <div className="flex flex-col gap-1 text-center">
                    <p className="text-default truncate text-sm font-semibold leading-tight">
                      {t("no_teams_to_migrate")}
                    </p>
                    <p className="text-subtle truncate text-xs font-medium leading-tight">
                      {t("create_teams_in_next_step")}
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
