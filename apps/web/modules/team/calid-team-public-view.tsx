"use client";

import { getDefaultAvatar } from "@calid/features/lib/defaultAvatar";
import { Branding } from "@calid/features/ui/Branding";
import { Button } from "@calid/features/ui/components/button";
import { Icon, type IconName } from "@calid/features/ui/components/icon";
// This route is reachable by
// 1. /team/[slug]
// 2. / (when on org domain e.g. http://calcom.cal.com/. This is through a rewrite from next.config.js)
// Also the getServerSideProps and default export are reused by
// 1. org/[orgSlug]/team/[slug]
// 2. org/[orgSlug]/[user]/[type]
import classNames from "classnames";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { sdkActionManager, useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { useBrandColors } from "@calcom/features/bookings/Booker/utils/use-brand-colors";
import { EventTypeDescription } from "@calcom/features/eventtypes/components";
import { getPlaceholderHeader } from "@calcom/lib/defaultHeaderImage";
import { getBrandLogoUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { useTelemetry } from "@calcom/lib/hooks/useTelemetry";
import { useGetTheme } from "@calcom/lib/hooks/useTheme";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { collectPageParameters, telemetryEventTypes } from "@calcom/lib/telemetry";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import { UserAvatarGroup } from "@calcom/ui/components/avatar";
import { Avatar } from "@calcom/ui/components/avatar";
import { UnpublishedEntity } from "@calcom/ui/components/unpublished-entity";

import { useToggleQuery } from "@lib/hooks/useToggleQuery";
import type { getCalIdServerSideProps } from "@lib/team/[slug]/getCalIdServerSideProps";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

import Team from "@components/team/screens/Team";

interface IconParams {
  icon: IconName;
  color: string;
}

function getIconParamsFromMetadata(metadata: any): IconParams {
  const iconParams = metadata?.iconParams as IconParams;
  return iconParams || { icon: "calendar", color: "#6B7280" };
}

function stripHtmlTags(html: string): string {
  if (typeof window !== "undefined") {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export type PageProps = inferSSRProps<typeof getCalIdServerSideProps>;
function TeamPage({ team, considerUnpublished, isValidOrgDomain, headerUrl }: PageProps) {
  useBrandColors({
    brandColor: team.brandColor,
    darkBrandColor: team.darkBrandColor,
    theme: team.theme,
  });

  const { resolvedTheme } = useGetTheme();
  const [isThemeReady, setIsThemeReady] = useState(false);

  // Wait for theme to be resolved before showing buttons to prevent color flash
  useEffect(() => {
    if (
      resolvedTheme ||
      (typeof window !== "undefined" && document.documentElement.classList.contains("dark"))
    ) {
      setIsThemeReady(true);
    } else if (typeof window !== "undefined") {
      // If no resolvedTheme yet, check if it's light mode (default)
      // In light mode, we can show immediately since there's no flash
      const isDarkMode = document.documentElement.classList.contains("dark");
      if (!isDarkMode) {
        setIsThemeReady(true);
      }
    }
  }, [resolvedTheme]);

  const routerQuery = useRouterQuery();
  const pathname = usePathname();
  const showMembers = useToggleQuery("members");
  const { t } = useLocale();
  const _isEmbed = useIsEmbed();
  const telemetry = useTelemetry();
  const teamName = team.name || t("nameless_team");
  const isBioEmpty = !team.bio || !team.bio.replace("<p><br></p>", "").length;
  const metadata = teamMetadataSchema.parse(team.metadata);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const BIO_CHAR_LIMIT = 250;
  const bioPlainText = stripHtmlTags(team.safeBio || "");
  const isBioLong = bioPlainText.length > BIO_CHAR_LIMIT;

  const teamOrOrgIsPrivate = team.isPrivate;

  useEffect(() => {
    telemetry.event(
      telemetryEventTypes.pageView,
      collectPageParameters("/team/[slug]", { isTeamBooking: true })
    );
  }, [telemetry, pathname]);

  useEffect(() => {
    if (team.faviconUrl) {
      const faviconUrl = getBrandLogoUrl({ faviconUrl: team.faviconUrl }, true);
      const defaultFavicons = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]');
      defaultFavicons.forEach((link) => {
        link.rel = "icon";
        link.href = faviconUrl;
        link.type = "image/png";
      });
      if (defaultFavicons.length === 0) {
        const link: HTMLLinkElement = document.createElement("link");
        link.rel = "icon";
        link.href = faviconUrl;
        link.type = "image/png";
        document.head.appendChild(link);
      }
    }
  }, [team.faviconUrl]);

  if (considerUnpublished) {
    const teamSlug = team.slug || metadata?.requestedSlug;
    // Show unpublished state for Organization itself if the team is an organization
    const slugPropertyName = team.isOrganization ? "orgSlug" : "teamSlug";
    return (
      <div className="flex h-full min-h-[calc(100dvh)] items-center justify-center">
        <UnpublishedEntity {...{ [slugPropertyName]: teamSlug }} logoUrl={team.logoUrl} name={team.name} />
      </div>
    );
  }

  // slug is a route parameter, we don't want to forward it to the next route
  const { slug: _slug, orgSlug: _orgSlug, user: _user, ...queryParamsToForward } = routerQuery;

  const EventTypes = ({ eventTypes }: { eventTypes: NonNullable<(typeof team)["eventTypes"]> }) => (
    <>
      {eventTypes.map((type: any, index: number) => {
        const iconParams = getIconParamsFromMetadata(type.metadata);
        return (
          <div
            key={index}
            className="dark:hover:bg-emphasis hover:bg-muted border-default bg-default group relative rounded-md border shadow-md transition hover:scale-[1.02]"
            data-testid="event-type-link">
            <div className="block w-full px-2 py-4">
              <div className="mb-2 flex flex-row items-center gap-2">
                <div className="self-start p-2">
                  <Icon
                    name={iconParams?.icon?.toLowerCase() as IconName}
                    className="h-6 w-6"
                    style={{ color: iconParams.color }}
                  />
                </div>
                <div className="mr-20">
                  <h3 className="text-default text-base font-semibold">{type.title}</h3>
                  {type.description && (
                    <div
                      className={classNames(
                        "text-subtle line-clamp-3 break-words text-sm",
                        "line-clamp-4 [&>*:not(:first-child)]:hidden"
                      )}
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{
                        __html: markdownToSafeHTML(type.descriptionAsSafeHTML || ""),
                      }}
                    />
                  )}
                </div>
              </div>
              <div className="flex w-full flex-row items-end justify-between">
                <div className="pl-12">
                  <EventTypeDescription eventType={type} isPublic={true} shortenDescription />
                </div>
                {isThemeReady ? (
                  <Link
                    key={type.id}
                    prefetch={false}
                    href={{
                      pathname: `${isValidOrgDomain ? "" : "/team"}/${team.slug}/${type.slug}`,
                      query: queryParamsToForward,
                    }}
                    passHref
                    onClick={async () => {
                      sdkActionManager?.fire("eventTypeSelected", {
                        eventType: type,
                      });
                    }}>
                    <Button
                      variant="button"
                      brandColor={team.brandColor}
                      darkBrandColor={team.darkBrandColor}
                      type="button"
                      size="base"
                      className="h-8 flex-shrink-0">
                      {t("schedule")}
                    </Button>
                  </Link>
                ) : (
                  <div className="h-8 w-20 flex-shrink-0" /> // Placeholder to prevent layout shift
                )}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );

  const SubTeams = () =>
    team.children.length ? (
      <ul className="divide-subtle border-subtle bg-default !static w-full divide-y rounded-md border">
        {team.children.map((ch: any, i: number) => {
          const memberCount = team.members.filter(
            (mem: any) => mem.subteams?.includes(ch.slug) && mem.accepted
          ).length;
          return (
            <li key={i} className="hover:bg-muted w-full rounded-md transition">
              <Link href={`/${ch.slug}`} className="flex items-center justify-between">
                <div className="flex items-center px-5 py-5">
                  <div className="ms-3 inline-block truncate">
                    <span className="text-default text-sm font-bold">{ch.name}</span>
                    <span className="text-subtle block text-xs">
                      {t("number_member", {
                        count: memberCount,
                      })}
                    </span>
                  </div>
                </div>
                <UserAvatarGroup
                  className="mr-6"
                  size="sm"
                  truncateAfter={4}
                  users={team.members.filter((mem: any) => mem.subteams?.includes(ch.slug) && mem.accepted)}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    ) : (
      <div className="space-y-6" data-testid="event-types">
        <div className="overflow-hidden rounded-sm border dark:border-gray-900">
          <div className="text-muted p-8 text-center">
            <h2 className="font-cal text-emphasis mb-2 text-3xl">{` ${t("org_no_teams_yet")}`}</h2>
            <p className="text-emphasis mx-auto max-w-md">{t("org_no_teams_yet_description")}</p>
          </div>
        </div>
      </div>
    );

  const profileImageSrc = getDefaultAvatar(team.logoUrl, team.name);
  const metadataHeaderUrl =
    headerUrl ?? (isPrismaObjOrUndefined(team?.metadata)?.headerUrl as string | null | undefined) ?? null;
  const resolvedHeader = getPlaceholderHeader(metadataHeaderUrl, team.name);

  return (
    <div className="bg-default flex min-h-screen w-full flex-col">
      <main className="bg-default h-full w-full">
        <div
          className="border-subtle bg-cal-gradient text-default mb-4 flex flex-col items-center bg-cover bg-center p-4"
          style={{
            backgroundImage: resolvedHeader ? `url(${resolvedHeader})` : undefined,
          }}>
          <Avatar
            size="xl"
            imageSrc={profileImageSrc}
            alt={teamName || "Team Avatar"}
            title={teamName || "Team"}
          />
          <h1 className="text-default mt-2 text-2xl font-bold" data-testid="team-name">
            {teamName}
          </h1>
          {!isBioEmpty && (
            <>
              <div className="text-subtle break-words text-center text-sm font-medium md:px-[10%] lg:px-[20%]">
                {isBioLong && !isBioExpanded ? (
                  <div className="relative inline-block w-full">
                    <div
                      className="line-clamp-2 overflow-hidden pr-0 md:pr-24"
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{ __html: team.safeBio }}
                    />
                    <div className="from-default via-default absolute bottom-0 right-0 hidden items-baseline md:inline-flex">
                      <button
                        onClick={() => setIsBioExpanded(!isBioExpanded)}
                        className="text-subtle hover:text-default whitespace-nowrap text-sm font-medium underline transition-colors"
                        type="button">
                        Read more
                      </button>
                    </div>
                    <div className="mt-2 flex w-full justify-center md:hidden">
                      <button
                        onClick={() => setIsBioExpanded(!isBioExpanded)}
                        className="text-subtle hover:text-default text-sm font-medium underline transition-colors"
                        type="button">
                        Read more
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div
                      className="overflow-visible"
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{ __html: team.safeBio }}
                    />
                    {isBioLong && (
                      <div className="mt-2">
                        <button
                          onClick={() => setIsBioExpanded(!isBioExpanded)}
                          className="text-subtle hover:text-default text-sm font-medium underline transition-colors"
                          type="button">
                          Read less
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {team.isOrganization ? (
          !teamOrOrgIsPrivate ? (
            <SubTeams />
          ) : (
            <div className="w-full text-center">
              <h2 className="text-emphasis font-semibold">{t("you_cannot_see_teams_of_org")}</h2>
            </div>
          )
        ) : (
          <>
            {(showMembers.isOn || !team.eventTypes?.length) &&
              (teamOrOrgIsPrivate ? (
                <div className="w-full text-center">
                  <h2 data-testid="you-cannot-see-team-members" className="text-emphasis font-semibold">
                    {t("you_cannot_see_team_members")}
                  </h2>
                </div>
              ) : (
                <Team
                  members={team.members}
                  teamName={team.name}
                  brandColor={team.brandColor}
                  darkBrandColor={team.darkBrandColor}
                />
              ))}
            {!showMembers.isOn && team.eventTypes && team.eventTypes.length > 0 && (
              <div
                className="bg-primary mx-auto flex flex-col gap-4 rounded-md pb-8 pt-2 lg:max-w-4xl"
                data-testid="event-types">
                <EventTypes eventTypes={team.eventTypes} />

                {/* Hide "Book a team member button when team is private or hideBookATeamMember is true" */}
                {!team.hideBookATeamMember && !teamOrOrgIsPrivate && (
                  <div>
                    <div className="mt-2 flex items-center justify-center">
                      <div className="bg-subtle h-px w-1/5 max-w-32 flex-none" />
                      <span className="text-subtle mx-4 whitespace-nowrap text-sm font-medium">
                        {t("or")}
                      </span>
                      <div className="bg-subtle h-px w-1/5 max-w-32 flex-none" />
                    </div>

                    <aside className="dark:text-inverted mt-8 flex justify-center text-center">
                      <Button
                        color="minimal"
                        EndIcon="arrow-right"
                        data-testid="book-a-team-member-btn"
                        className="dark:hover:bg-darkgray-200"
                        href={{
                          pathname: `${isValidOrgDomain ? "" : "/team"}/${team.slug}`,
                          query: {
                            ...queryParamsToForward,
                            members: "1",
                          },
                        }}
                        shallow={true}>
                        {t("book_a_team_member")}
                      </Button>
                    </aside>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {team.bannerUrl ? (
          <div key="logo" className="mb-8 flex w-full justify-center [&_img]:h-[32px]">
            <Branding size="xs" bannerUrl={getBrandLogoUrl({ bannerUrl: team.bannerUrl })} />
          </div>
        ) : (
          <div key="logo" className="mb-8 flex w-full justify-center [&_img]:h-[32px]">
            <Branding size="xs" />
          </div>
        )}
      </main>
    </div>
  );
}

export default TeamPage;
