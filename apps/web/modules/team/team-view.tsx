"use client";

import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon";
// This route is reachable by
// 1. /team/[slug]
// 2. / (when on org domain e.g. http://calcom.cal.com/. This is through a rewrite from next.config.js)
// Also the getServerSideProps and default export are reused by
// 1. org/[orgSlug]/team/[slug]
// 2. org/[orgSlug]/[user]/[type]
import classNames from "classnames";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { sdkActionManager, useIsEmbed } from "@calcom/embed-core/embed-iframe";
import EventTypeDescription from "@calcom/features/eventtypes/components/EventTypeDescription";
import { getDefaultAvatar } from "@calid/features/lib/defaultAvatar";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { useTelemetry } from "@calcom/lib/hooks/useTelemetry";
import useTheme from "@calcom/lib/hooks/useTheme";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { collectPageParameters, telemetryEventTypes } from "@calcom/lib/telemetry";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import { UserAvatarGroup } from "@calcom/ui/components/avatar";
import { Avatar } from "@calcom/ui/components/avatar";
import { UnpublishedEntity } from "@calcom/ui/components/unpublished-entity";

import { useToggleQuery } from "@lib/hooks/useToggleQuery";
import type { getServerSideProps } from "@lib/team/[slug]/getServerSideProps";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

import Team from "@components/team/screens/Team";

export type PageProps = inferSSRProps<typeof getServerSideProps>;
function TeamPage({ team, considerUnpublished, isValidOrgDomain }: PageProps) {
  useTheme(team.theme);
  const routerQuery = useRouterQuery();
  const pathname = usePathname();
  const showMembers = useToggleQuery("members");
  const { t } = useLocale();
  const isEmbed = useIsEmbed();
  const telemetry = useTelemetry();
  const teamName = team.name || t("nameless_team");
  const isBioEmpty = !team.bio || !team.bio.replace("<p><br></p>", "").length;
  const metadata = teamMetadataSchema.parse(team.metadata);

  const teamOrOrgIsPrivate = team.isPrivate || (team?.parent?.isOrganization && team.parent?.isPrivate);

  useEffect(() => {
    telemetry.event(
      telemetryEventTypes.pageView,
      collectPageParameters("/team/[slug]", { isTeamBooking: true })
    );
  }, [telemetry, pathname]);

  if (considerUnpublished) {
    const teamSlug = team.slug || metadata?.requestedSlug;
    const parentSlug = team.parent?.slug || team.parent?.requestedSlug;
    // Show unpublished state for parent Organization itself, if the team is a subteam(team.parent is NOT NULL)
    const slugPropertyName = team.parent || team.isOrganization ? "orgSlug" : "teamSlug";
    return (
      <div className="flex h-full min-h-[calc(100dvh)] items-center justify-center">
        <UnpublishedEntity
          {...{ [slugPropertyName]: team.parent ? parentSlug : teamSlug }}
          logoUrl={team.parent?.logoUrl || team.logoUrl}
          name={team.parent ? team.parent.name : team.name}
        />
      </div>
    );
  }

  // slug is a route parameter, we don't want to forward it to the next route
  const { slug: _slug, orgSlug: _orgSlug, user: _user, ...queryParamsToForward } = routerQuery;

  const EventTypes = ({ eventTypes }: { eventTypes: NonNullable<(typeof team)["eventTypes"]> }) => (
    <div>
      {eventTypes.map((type, index) => (
        <div
          key={index}
          className={classNames(
            "bg-muted border-subtle dark:bg-muted dark:hover:bg-emphasis hover:bg-muted group relative mb-6 rounded-md border transition",
            !isEmbed && "bg-default"
          )}>
          <div className="px-6 py-4 ">
            {/* <Link
              href={{
                pathname: `${isValidOrgDomain ? "" : "/team"}/${team.slug}/${type.slug}`,
                query: queryParamsToForward,
              }}
              onClick={async () => {
                sdkActionManager?.fire("eventTypeSelected", {
                  eventType: type,
                });
              }}
              data-testid="event-type-link"
              className="flex justify-between"> */}
            {/* <div className="flex-shrink">
                <div className="flex flex-wrap items-center space-x-2 rtl:space-x-reverse">
                  <h2 className=" text-default text-sm font-semibold">{type.title}</h2>
                </div>
                <EventTypeDescription className="text-sm" eventType={type} />
              </div> */}

            <div className="flex flex-col">
              <div className="flex flex-row items-center gap-2">
                <div className="bg-default rounded-lg p-2">
                  <Icon name="calendar" className="h-8 w-8" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center">
                    <h2 className="text-default pr-2 text-base font-semibold">{type.title}</h2>
                  </div>

                  {type.description && (
                    <div
                      className={classNames(
                        "text-subtle line-clamp-3 break-words text-sm sm:max-w-[650px] [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600",
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

              <div className="mt-1 flex w-full flex-row justify-between">
                <EventTypeDescription
                  eventType={type}
                  isPublic={true}
                  shortenDescription
                  showDescription={false}
                />
                <Link
                  key={type.id}
                  // style={{ display: "flex", ...eventTypeListItemEmbedStyles }}
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
                  <Button variant="fab">{t("schedule")}</Button>
                </Link>
              </div>
            </div>

            <div className="mt-1 self-center">
              <UserAvatarGroup
                truncateAfter={4}
                className="flex flex-shrink-0"
                size="sm"
                users={type.users}
              />
            </div>
            {/* </Link> */}
          </div>
        </div>
      ))}
    </div>
  );

  const SubTeams = () =>
    team.children.length ? (
      <ul className="divide-subtle border-subtle bg-default !static w-full divide-y rounded-md border">
        {team.children.map((ch, i) => {
          const memberCount = team.members.filter(
            (mem) => mem.subteams?.includes(ch.slug) && mem.accepted
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
                  users={team.members.filter((mem) => mem.subteams?.includes(ch.slug) && mem.accepted)}
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

  const profileImageSrc = getDefaultAvatar(team);

  return (
    <>
      <main className="bg-default dark:bg-default h-full w-full rounded-md pb-12">
        <div className="border-subtle text-default bg-cal-gradient mb-8  flex flex-col items-center py-4">
          <div className="relative">
            <Avatar alt={teamName} imageSrc={profileImageSrc} size="xl" />
          </div>
          <h1 className="font-cal text-emphasis mb-4 mt-4 text-3xl" data-testid="team-name">
            {team.parent && `${team.parent.name} `}
            {teamName}
          </h1>
          {!isBioEmpty && (
            <>
              <div
                className="  text-subtle break-words text-sm [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: team.safeBio }}
              />
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
                <Team members={team.members} teamName={team.name} />
              ))}
            {!showMembers.isOn && team.eventTypes && team.eventTypes.length > 0 && (
              <div className="w-full p-4 px-[15%] py-[1%]">
                <EventTypes eventTypes={team.eventTypes} />

                {/* Hide "Book a team member button when team is private or hideBookATeamMember is true" */}
                {!team.hideBookATeamMember && !teamOrOrgIsPrivate && (
                  <div>
                    <div className="relative mt-12">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="border-subtle w-full border-t" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-subtle text-subtle px-2 text-sm">{t("or")}</span>
                      </div>
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
      </main>
    </>
  );
}

export default TeamPage;
