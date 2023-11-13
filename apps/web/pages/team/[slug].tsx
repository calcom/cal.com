// This route is reachable by
// 1. /team/[slug]
// 2. / (when on org domain e.g. http://calcom.cal.com/. This is through a rewrite from next.config.js)
// Also the getServerSideProps and default export are reused by
// 1. org/[orgSlug]/team/[slug]
// 2. org/[orgSlug]/[user]/[type]
import classNames from "classnames";
import type { GetServerSidePropsContext } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { sdkActionManager, useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { orgDomainConfig, getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import EventTypeDescription from "@calcom/features/eventtypes/components/EventTypeDescription";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import useTheme from "@calcom/lib/hooks/useTheme";
import logger from "@calcom/lib/logger";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { getTeamWithMembers } from "@calcom/lib/server/queries/teams";
import slugify from "@calcom/lib/slugify";
import { stripMarkdown } from "@calcom/lib/stripMarkdown";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import prisma from "@calcom/prisma";
import { RedirectType } from "@calcom/prisma/client";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import { Avatar, Button, HeadSeo, UnpublishedEntity } from "@calcom/ui";
import { ArrowRight } from "@calcom/ui/components/icon";

import { useToggleQuery } from "@lib/hooks/useToggleQuery";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

import PageWrapper from "@components/PageWrapper";
import Team from "@components/team/screens/Team";
import { UserAvatarGroup } from "@components/ui/avatar/UserAvatarGroup";

import { ssrInit } from "@server/lib/ssr";

import { getTemporaryOrgRedirect } from "../../lib/getTemporaryOrgRedirect";

export type PageProps = inferSSRProps<typeof getServerSideProps>;
const log = logger.getSubLogger({ prefix: ["team/[slug]"] });
function TeamPage({
  team,
  isUnpublished,
  markdownStrippedBio,
  isValidOrgDomain,
  currentOrgDomain,
}: PageProps) {
  useTheme(team.theme);
  const routerQuery = useRouterQuery();
  const pathname = usePathname();
  const showMembers = useToggleQuery("members");
  const { t } = useLocale();
  const isEmbed = useIsEmbed();
  const telemetry = useTelemetry();
  const teamName = team.name || "Nameless Team";
  const isBioEmpty = !team.bio || !team.bio.replace("<p><br></p>", "").length;
  const metadata = teamMetadataSchema.parse(team.metadata);

  useEffect(() => {
    telemetry.event(
      telemetryEventTypes.pageView,
      collectPageParameters("/team/[slug]", { isTeamBooking: true })
    );
  }, [telemetry, pathname]);

  if (isUnpublished) {
    const slug = team.slug || metadata?.requestedSlug;
    return (
      <div className="flex h-full min-h-[100dvh] items-center justify-center">
        <UnpublishedEntity
          {...(metadata?.isOrganization || team.parentId ? { orgSlug: slug } : { teamSlug: slug })}
          name={teamName}
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
            "dark:bg-darkgray-100 bg-default hover:bg-muted border-subtle group relative border-b first:rounded-t-md last:rounded-b-md last:border-b-0",
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
              <div className="flex-shrink">
                <div className="flex flex-wrap items-center space-x-2 rtl:space-x-reverse">
                  <h2 className=" text-default text-sm font-semibold">{type.title}</h2>
                </div>
                <EventTypeDescription className="text-sm" eventType={type} />
              </div>
              <div className="mt-1 self-center">
                <UserAvatarGroup
                  truncateAfter={4}
                  className="flex flex-shrink-0"
                  size="sm"
                  users={type.users}
                />
              </div>
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );

  const SubTeams = () =>
    team.children.length ? (
      <ul className="divide-subtle border-subtle bg-default !static w-full divide-y rounded-md border">
        {team.children.map((ch, i) => {
          const memberCount = team.members.filter(
            (mem) => mem.subteams?.includes(ch.slug) && mem.accepted
          ).length;
          return (
            <li key={i} className="hover:bg-muted w-full">
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

  return (
    <>
      <HeadSeo
        title={teamName}
        description={teamName}
        meeting={{
          title: markdownStrippedBio,
          profile: {
            name: `${team.name}`,
            image: `${WEBAPP_URL}/${team.metadata?.isOrganization ? "org" : "team"}/${team.slug}/avatar.png`,
          },
        }}
      />
      <main className="dark:bg-darkgray-50 bg-subtle mx-auto max-w-3xl rounded-md px-4 pb-12 pt-12">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <div className="relative">
            <Avatar
              alt={teamName}
              imageSrc={
                isValidOrgDomain
                  ? `/org/${currentOrgDomain}/avatar.png`
                  : `${WEBAPP_URL}/${team.metadata?.isOrganization ? "org" : "team"}/${team.slug}/avatar.png`
              }
              size="lg"
            />
          </div>
          <p className="font-cal  text-emphasis mb-2 text-2xl tracking-wider" data-testid="team-name">
            {team.parent && `${team.parent.name} `}
            {teamName}
          </p>
          {!isBioEmpty && (
            <>
              <div
                className="  text-subtle break-words text-sm [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600"
                dangerouslySetInnerHTML={{ __html: team.safeBio }}
              />
            </>
          )}
        </div>
        {metadata?.isOrganization ? (
          <SubTeams />
        ) : (
          <>
            {(showMembers.isOn || !team.eventTypes?.length) &&
              (team.isPrivate ? (
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
                {!team.hideBookATeamMember && !team.isPrivate && (
                  <div>
                    <div className="relative mt-12">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="border-subtle w-full border-t" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="dark:bg-darkgray-50 bg-subtle text-subtle px-2 text-sm">
                          {t("or")}
                        </span>
                      </div>
                    </div>

                    <aside className="dark:text-inverted mt-8 flex justify-center text-center">
                      <Button
                        color="minimal"
                        EndIcon={ArrowRight}
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

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const slug = Array.isArray(context.query?.slug) ? context.query.slug.pop() : context.query.slug;
  const { isValidOrgDomain, currentOrgDomain } = orgDomainConfig(context.req, context.params?.orgSlug);
  const isOrgContext = isValidOrgDomain && currentOrgDomain;

  // Provided by Rewrite from next.config.js
  const isOrgProfile = context.query?.isOrgProfile === "1";
  const flags = await getFeatureFlagMap(prisma);
  const isOrganizationFeatureEnabled = flags["organizations"];

  log.debug("getServerSideProps", {
    isOrgProfile,
    isOrganizationFeatureEnabled,
    isValidOrgDomain,
    currentOrgDomain,
  });

  const team = await getTeamWithMembers({
    slug: slugify(slug ?? ""),
    orgSlug: currentOrgDomain,
    isTeamView: true,
    isOrgView: isValidOrgDomain && isOrgProfile,
  });

  if (!isOrgContext && slug) {
    const redirect = await getTemporaryOrgRedirect({
      slug: slug,
      redirectType: RedirectType.Team,
      eventTypeSlug: null,
      currentQuery: context.query,
    });

    if (redirect) {
      return redirect;
    }
  }

  const ssr = await ssrInit(context);
  const metadata = teamMetadataSchema.parse(team?.metadata ?? {});

  // Taking care of sub-teams and orgs
  if (
    (!isValidOrgDomain && team?.parent) ||
    (!isValidOrgDomain && !!metadata?.isOrganization) ||
    !isOrganizationFeatureEnabled
  ) {
    return { notFound: true } as const;
  }

  if (!team || (team.parent && !team.parent.slug)) {
    const unpublishedTeam = await prisma.team.findFirst({
      where: {
        ...(team?.parent
          ? { id: team.parent.id }
          : {
              metadata: {
                path: ["requestedSlug"],
                equals: slug,
              },
            }),
      },
    });

    if (!unpublishedTeam) return { notFound: true } as const;

    return {
      props: {
        isUnpublished: true,
        team: { ...unpublishedTeam, createdAt: null },
        trpcState: ssr.dehydrate(),
      },
    } as const;
  }

  team.eventTypes =
    team.eventTypes?.map((type) => ({
      ...type,
      users: type.users.map((user) => ({
        ...user,
        avatar: `/${user.username}/avatar.png`,
      })),
      descriptionAsSafeHTML: markdownToSafeHTML(type.description),
    })) ?? null;

  const safeBio = markdownToSafeHTML(team.bio) || "";

  const members = !team.isPrivate
    ? team.members.map((member) => {
        return {
          name: member.name,
          id: member.id,
          bio: member.bio,
          subteams: member.subteams,
          username: member.username,
          accepted: member.accepted,
          organizationId: member.organizationId,
          safeBio: markdownToSafeHTML(member.bio || ""),
          orgOrigin: getOrgFullOrigin(member.organization?.slug || ""),
        };
      })
    : [];

  const markdownStrippedBio = stripMarkdown(team?.bio || "");

  const { inviteToken: _inviteToken, ...serializableTeam } = team;

  return {
    props: {
      team: { ...serializableTeam, safeBio, members, metadata },
      themeBasis: serializableTeam.slug,
      trpcState: ssr.dehydrate(),
      markdownStrippedBio,
      isValidOrgDomain,
      currentOrgDomain,
    },
  } as const;
};

TeamPage.isBookingPage = true;
TeamPage.PageWrapper = PageWrapper;

export default TeamPage;
