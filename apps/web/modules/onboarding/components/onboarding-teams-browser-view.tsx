"use client";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Avatar } from "@calcom/ui/components/avatar";
import { Icon } from "@calcom/ui/components/icon";

type OnboardingTeamsBrowserViewProps = {
  teams: Array<{ name: string }>;
  organizationLogo?: string | null;
  organizationName?: string;
  organizationBanner?: string | null;
};

export const OnboardingTeamsBrowserView = ({
  teams,
  organizationLogo,
  organizationName,
  organizationBanner,
}: OnboardingTeamsBrowserViewProps) => {
  const { t } = useLocale();
  const webappUrl = WEBAPP_URL.replace(/^https?:\/\//, "");

  // Show placeholder if no teams or all teams are empty
  const hasValidTeams = teams.some((team) => team.name && team.name.trim().length > 0);

  return (
    <div className="bg-default border-subtle hidden h-full w-full flex-col rounded-l-2xl border xl:flex">
      {/* Browser header */}
      <div className="border-subtle flex min-w-0 shrink-0 items-center gap-3 rounded-t-2xl border-b bg-white p-3">
        {/* Navigation buttons */}
        <div className="flex shrink-0 items-center gap-4 opacity-50">
          <Icon name="arrow-left" className="text-subtle h-4 w-4" />
          <Icon name="arrow-right" className="text-subtle h-4 w-4" />
          <Icon name="rotate-cw" className="text-subtle h-4 w-4" />
        </div>
        <div className="bg-muted flex w-full items-center gap-2 rounded-[32px] px-3 py-2">
          <Icon name="lock" className="text-subtle h-4 w-4" />
          <p className="text-default text-sm font-medium leading-tight">{webappUrl}/teams</p>
        </div>
        <Icon name="ellipsis-vertical" className="text-subtle h-4 w-4" />
      </div>

      {/* Content */}
      <div className="bg-muted h-full pl-11 pt-11">
        <div className="bg-default border-muted flex h-full w-full flex-col overflow-hidden rounded-xl border">
          {/* Teams Header with Banner */}
          <div className="border-subtle flex flex-col border-b">
            <div className="relative">
              {/* Banner Image */}
              <div className="border-subtle relative h-40 w-full overflow-hidden rounded-t-xl border-b">
                {organizationBanner ? (
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
                    className="border-4 border-white"
                  />
                </div>
              )}
            </div>

            {/* Teams Info */}
            <div className="flex flex-col gap-2 px-4 pb-4 pt-12">
              <h2 className="text-emphasis text-xl font-semibold leading-tight">{t("teams")}</h2>
              <p className="text-subtle text-sm leading-normal">
                {hasValidTeams
                  ? t("onboarding_teams_browser_view_subtitle")
                  : t("onboarding_teams_browser_view_placeholder_subtitle")}
              </p>
            </div>
          </div>

          {/* Teams List */}
          <div className="flex flex-col overflow-y-auto">
            {hasValidTeams ? (
              teams
                .filter((team) => team.name && team.name.trim().length > 0)
                .map((team, index) => (
                  <div key={index} className="">
                    {index > 0 && <div className="border-subtle h-px border-t" />}
                    <div className="flex items-center gap-3 px-5 py-4">
                      <Avatar
                        size="md"
                        alt={team.name}
                        className="border-2 border-white"
                        fallback={
                          <div className="bg-emphasis flex h-full w-full items-center justify-center text-white">
                            <span className="text-sm font-semibold">{team.name.charAt(0).toUpperCase()}</span>
                          </div>
                        }
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <h3 className="text-subtle text-sm font-semibold leading-none">{team.name}</h3>
                        <p className="text-muted text-xs font-medium leading-tight">
                          {t("onboarding_teams_browser_view_team_description")}
                        </p>
                      </div>
                      <Icon name="arrow-right" className="text-subtle h-4 w-4" />
                    </div>
                  </div>
                ))
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 px-5 py-12">
                <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
                  <Icon name="users" className="text-subtle h-8 w-8" />
                </div>
                <div className="flex flex-col gap-1 text-center">
                  <p className="text-default text-sm font-semibold leading-tight">
                    {t("onboarding_teams_browser_view_no_teams_title")}
                  </p>
                  <p className="text-subtle text-xs font-medium leading-tight">
                    {t("onboarding_teams_browser_view_no_teams_description")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
