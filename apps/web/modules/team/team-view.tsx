"use client";

// This route is reachable by
// 1. /team/[slug]
// 2. / (when on org domain e.g. http://calcom.cal.com/. This is through a rewrite from next.config.js)
// Also the getServerSideProps and default export are reused by
// 1. org/[orgSlug]/team/[slug]
// 2. org/[orgSlug]/[user]/[type]
import classNames from "classnames";
import Link from "next/link";

import { sdkActionManager, useIsEmbed } from "@calcom/embed-core/embed-iframe";
import EventTypeDescription from "@calcom/features/eventtypes/components/EventTypeDescription";
import { getOrgOrTeamAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import useTheme from "@calcom/lib/hooks/useTheme";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import { UserAvatarGroup } from "@calcom/ui/components/avatar";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { UnpublishedEntity } from "@calcom/ui/components/unpublished-entity";

import { useToggleQuery } from "@lib/hooks/useToggleQuery";
import type { getServerSideProps } from "@lib/team/[slug]/getServerSideProps";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

import Team from "@components/team/screens/Team";

export type PageProps = inferSSRProps<typeof getServerSideProps>;
function TeamPage({ team, considerUnpublished, isValidOrgDomain }: PageProps) {
  useTheme(team.theme);
  const routerQuery = useRouterQuery();
  const showMembers = useToggleQuery("members");
  const { t } = useLocale();
  const isEmbed = useIsEmbed();
  const teamName = team.name || t("nameless_team");
  const isBioEmpty = !team.bio || !team.bio.replace("<p><br></p>", "").length;
  const metadata = teamMetadataSchema.parse(team.metadata);

  const teamOrOrgIsPrivate = team.isPrivate || (team?.parent?.isOrganization && team.parent?.isPrivate);

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
    <ul className="border-subtle rounded-md border">
      {eventTypes.map((type, index) => (
        <li
          key={index}
          className={classNames(
            "bg-default hover:bg-cal-muted border-subtle group relative border-b transition first:rounded-t-md last:rounded-b-md last:border-b-0",
            !isEmbed && "bg-default"
          )}>
          <div className="px-6 py-4 ">
            <Link
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
              className="flex justify-between">
              <div className="shrink">
                <div className="flex flex-wrap items-center space-x-2 rtl:space-x-reverse">
                  <h2 className=" text-default text-sm font-semibold">{type.title}</h2>
                </div>
                <EventTypeDescription className="text-sm" eventType={type} />
              </div>
              <div className="mt-1 self-center">
                <UserAvatarGroup truncateAfter={4} className="flex shrink-0" size="sm" users={type.users} />
              </div>
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );

  const SubTeams = () =>
    team.children.length ? (
      <ul className="divide-subtle border-subtle bg-default static! w-full divide-y rounded-md border">
        {team.children.map((ch, i) => {
          const memberCount = team.members.filter(
            (mem) => mem.subteams?.includes(ch.slug) && mem.accepted
          ).length;
          return (
            <li key={i} className="hover:bg-cal-muted w-full rounded-md transition">
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
      <div className="stack-y-6" data-testid="event-types">
        <div className="overflow-hidden rounded-sm border dark:border-gray-900">
          <div className="text-muted p-8 text-center">
            <h2 className="font-cal text-emphasis mb-2 text-3xl">{` ${t("org_no_teams_yet")}`}</h2>
            <p className="text-emphasis mx-auto max-w-md">{t("org_no_teams_yet_description")}</p>
          </div>
        </div>
      </div>
    );

  const profileImageSrc = getOrgOrTeamAvatar(team);

  return (
    <>
      <main className="dark:bg-default bg-subtle mx-auto max-w-3xl rounded-md px-4 pb-12 pt-12">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <div className="relative">
            <Avatar alt={teamName} imageSrc={profileImageSrc} size="lg" />
          </div>
          <p className="font-cal  text-emphasis mb-2 text-2xl tracking-wider" data-testid="team-name">
            {team.parent && `${team.parent.name} `}
            {teamName}
          </p>
          {!isBioEmpty && (
            <>
              <div
                className="  text-subtle wrap-break-word text-sm [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600"
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
              <div className="mx-auto max-w-3xl ">
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
