import classNames from "classnames";
import type { GetServerSidePropsContext } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";

import { sdkActionManager, useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import EventTypeDescription from "@calcom/features/eventtypes/components/EventTypeDescription";
import { CAL_URL, WEBAPP_URL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { getTeamWithMembers } from "@calcom/lib/server/queries/teams";
import { stripMarkdown } from "@calcom/lib/stripMarkdown";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import prisma from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import { Avatar, AvatarGroup, Button, EmptyScreen, HeadSeo } from "@calcom/ui";
import { ArrowRight } from "@calcom/ui/components/icon";

import { useToggleQuery } from "@lib/hooks/useToggleQuery";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

import PageWrapper from "@components/PageWrapper";
import Team from "@components/team/screens/Team";

import { ssrInit } from "@server/lib/ssr";

export type TeamPageProps = inferSSRProps<typeof getServerSideProps>;
function TeamPage({ team, isUnpublished, markdownStrippedBio, isValidOrgDomain }: TeamPageProps) {
  useTheme(team.theme);
  const showMembers = useToggleQuery("members");
  const { t } = useLocale();
  const isEmbed = useIsEmbed();
  const telemetry = useTelemetry();
  const router = useRouter();
  const teamName = team.name || "Nameless Team";
  const isBioEmpty = !team.bio || !team.bio.replace("<p><br></p>", "").length;
  const metadata = teamMetadataSchema.parse(team.metadata);

  useEffect(() => {
    telemetry.event(
      telemetryEventTypes.pageView,
      collectPageParameters("/team/[slug]", { isTeamBooking: true })
    );
  }, [telemetry, router.asPath]);

  if (isUnpublished) {
    return (
      <div className="m-8 flex items-center justify-center">
        <EmptyScreen
          avatar={<Avatar alt={teamName} imageSrc={getPlaceholderAvatar(team.logo, team.name)} size="lg" />}
          headline={t("team_is_unpublished", {
            team: teamName,
          })}
          description={t("team_is_unpublished_description", {
            entity: metadata?.isOrganization ? t("organization").toLowerCase() : t("team").toLowerCase(),
          })}
        />
      </div>
    );
  }

  // slug is a route parameter, we don't want to forward it to the next route
  const { slug: _slug, ...queryParamsToForward } = router.query;

  const EventTypes = () => (
    <ul className="border-subtle rounded-md border">
      {team.eventTypes.map((type, index) => (
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
                <AvatarGroup
                  truncateAfter={4}
                  className="flex flex-shrink-0"
                  size="sm"
                  items={type.users.map((user) => ({
                    alt: user.name || "",
                    title: user.name || "",
                    image: CAL_URL + "/" + user.username + "/avatar.png" || "",
                  }))}
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
        {team.children.map((ch, i) => (
          <li key={i} className="hover:bg-muted w-full">
            <Link href={`/${ch.slug}`} className="flex items-center justify-between">
              <div className="flex items-center px-5 py-5">
                <Avatar
                  size="md"
                  imageSrc={getPlaceholderAvatar(ch?.logo, ch?.name as string)}
                  alt="Team Logo"
                  className="inline-flex justify-center"
                />
                <div className="ms-3 inline-block truncate">
                  <span className="text-default text-sm font-bold">{ch.name}</span>
                  <span className="text-subtle block text-xs">
                    {t("number_member", { count: ch.members.length })}
                  </span>
                </div>
              </div>
              <AvatarGroup
                className="mr-6"
                size="sm"
                truncateAfter={4}
                items={ch.members.map(({ user: member }) => ({
                  alt: member.name || "",
                  image: `${WEBAPP_URL}/${member.username}/avatar.png`,
                  title: member.name || "",
                }))}
              />
            </Link>
          </li>
        ))}
      </ul>
    ) : (
      <div className="space-y-6" data-testid="event-types">
        <div className="overflow-hidden rounded-sm border dark:border-gray-900">
          <div className="text-muted dark:text-inverted p-8 text-center">
            <h2 className="font-cal dark:text-inverted text-emphasis600 mb-2 text-3xl">
              {" " + t("no_teams_yet")}
            </h2>
            <p className="mx-auto max-w-md">{t("no_teams_yet_description")}</p>
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
          profile: { name: `${team.name}`, image: getPlaceholderAvatar(team.logo, team.name) },
        }}
      />
      <main className="dark:bg-darkgray-50 bg-subtle mx-auto max-w-3xl rounded-md px-4 pt-12 pb-12">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <div className="relative">
            <Avatar
              alt={teamName}
              imageSrc={getPlaceholderAvatar(team.parent ? team.parent.logo : team.logo, team.name)}
              size="lg"
            />
          </div>
          <p className="font-cal  text-emphasis mb-2 text-2xl tracking-wider">
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
            {(showMembers.isOn || !team.eventTypes.length) && <Team team={team} />}
            {!showMembers.isOn && team.eventTypes.length > 0 && (
              <div className="mx-auto max-w-3xl ">
                <EventTypes />

                {!team.hideBookATeamMember && (
                  <div>
                    <div className="relative mt-12">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="border-subtle w-full border-t" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="dark:bg-darkgray-50 bg-subtle text-subtle dark:text-inverted px-2 text-sm">
                          {t("or")}
                        </span>
                      </div>
                    </div>

                    <aside className="dark:text-inverted mt-8 flex justify-center text-center">
                      <Button
                        color="minimal"
                        EndIcon={ArrowRight}
                        className="dark:hover:bg-darkgray-200"
                        href={{
                          pathname: `${isValidOrgDomain ? "" : "/team"}/${team.slug}`,
                          query: {
                            members: "1",
                            ...queryParamsToForward,
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
  const ssr = await ssrInit(context);
  const slug = Array.isArray(context.query?.slug) ? context.query.slug.pop() : context.query.slug;
  const { isValidOrgDomain } = orgDomainConfig(context.req.headers.host ?? "");

  const team = await getTeamWithMembers(undefined, slug);
  const metadata = teamMetadataSchema.parse(team?.metadata ?? {});

  // Taking care of sub-teams and orgs
  if (
    (isValidOrgDomain && team?.parent && !!metadata?.isOrganization) ||
    (!isValidOrgDomain && team?.parent) ||
    (!isValidOrgDomain && !!metadata?.isOrganization)
  ) {
    return { notFound: true } as const;
  }

  if (!team) {
    const unpublishedTeam = await prisma.team.findFirst({
      where: {
        metadata: {
          path: ["requestedSlug"],
          equals: slug,
        },
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

  team.eventTypes = team.eventTypes.map((type) => ({
    ...type,
    users: type.users.map((user) => ({
      ...user,
      avatar: CAL_URL + "/" + user.username + "/avatar.png",
    })),
    descriptionAsSafeHTML: markdownToSafeHTML(type.description),
  }));

  const safeBio = markdownToSafeHTML(team.bio) || "";

  const members = team.members.map((member) => {
    return { ...member, safeBio: markdownToSafeHTML(member.bio || "") };
  });

  const markdownStrippedBio = stripMarkdown(team?.bio || "");

  return {
    props: {
      team: { ...team, safeBio, members },
      themeBasis: team.slug,
      trpcState: ssr.dehydrate(),
      markdownStrippedBio,
      isValidOrgDomain,
    },
  } as const;
};

TeamPage.isBookingPage = true;
TeamPage.PageWrapper = PageWrapper;

export default TeamPage;
