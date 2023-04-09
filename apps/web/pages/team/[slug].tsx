import classNames from "classnames";
import type { GetServerSidePropsContext } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";

import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import EventTypeDescription from "@calcom/features/eventtypes/components/EventTypeDescription";
import { CAL_URL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { getTeamWithMembers } from "@calcom/lib/server/queries/teams";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import prisma from "@calcom/prisma";
import { Avatar, AvatarGroup, Button, EmptyScreen, HeadSeo } from "@calcom/ui";
import { FiArrowRight } from "@calcom/ui/components/icon";

import { useToggleQuery } from "@lib/hooks/useToggleQuery";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

import Team from "@components/team/screens/Team";

import { ssrInit } from "@server/lib/ssr";

export type TeamPageProps = inferSSRProps<typeof getServerSideProps>;
function TeamPage({ team, isUnpublished }: TeamPageProps) {
  useTheme(team.theme);
  const showMembers = useToggleQuery("members");
  const { t } = useLocale();
  const isEmbed = useIsEmbed();
  const telemetry = useTelemetry();
  const router = useRouter();
  const teamName = team.name || "Nameless Team";
  const isBioEmpty = !team.bio || !team.bio.replace("<p><br></p>", "").length;

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
          headline={t("team_is_unpublished", { team: teamName })}
          description={t("team_is_unpublished_description")}
        />
      </div>
    );
  }

  const EventTypes = () => (
    <ul className="dark:border-darkgray-300 border-subtle rounded-md border">
      {team.eventTypes.map((type, index) => (
        <li
          key={index}
          className={classNames(
            "dark:bg-darkgray-100 dark:border-darkgray-300 bg-default hover:bg-muted border-subtle group relative border-b first:rounded-t-md last:rounded-b-md last:border-b-0",
            !isEmbed && "bg-default"
          )}>
          <div className="px-6 py-4 ">
            <Link
              href={`/team/${team.slug}/${type.slug}`}
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

  return (
    <>
      <HeadSeo
        title={teamName}
        description={teamName}
        meeting={{
          title: team?.bio || "",
          profile: { name: `${team.name}`, image: getPlaceholderAvatar(team.logo, team.name) },
        }}
      />
      <main className="dark:bg-darkgray-50 bg-subtle mx-auto max-w-3xl rounded-md px-4 pt-12 pb-12">
        <div className="max-w-96 mx-auto mb-8 text-center">
          <Avatar alt={teamName} imageSrc={getPlaceholderAvatar(team.logo, team.name)} size="lg" />
          <p className="font-cal  text-emphasis mb-2 text-2xl tracking-wider">{teamName}</p>
          {!isBioEmpty && (
            <>
              <div
                className=" text-subtle text-sm [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600"
                dangerouslySetInnerHTML={{ __html: team.safeBio }}
              />
            </>
          )}
        </div>
        {(showMembers.isOn || !team.eventTypes.length) && <Team team={team} />}
        {!showMembers.isOn && team.eventTypes.length > 0 && (
          <div className="mx-auto max-w-3xl ">
            <EventTypes />

            {!team.hideBookATeamMember && (
              <div>
                <div className="relative mt-12">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="dark:border-darkgray-300 border-subtle w-full border-t" />
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
                    EndIcon={FiArrowRight}
                    className="dark:hover:bg-darkgray-200"
                    href={`/team/${team.slug}?members=1`}
                    shallow={true}>
                    {t("book_a_team_member")}
                  </Button>
                </aside>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);
  const slug = Array.isArray(context.query?.slug) ? context.query.slug.pop() : context.query.slug;

  const unpublishedTeam = await prisma.team.findFirst({
    where: {
      metadata: {
        path: ["requestedSlug"],
        equals: slug,
      },
    },
  });

  if (unpublishedTeam) {
    return {
      props: {
        isUnpublished: true,
        team: unpublishedTeam,
        trpcState: ssr.dehydrate(),
      },
    } as const;
  }

  const team = await getTeamWithMembers(undefined, slug);

  if (!team) return { notFound: true } as { notFound: true };

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

  return {
    props: {
      team: { ...team, safeBio, members },
      trpcState: ssr.dehydrate(),
    },
  } as const;
};

export default TeamPage;
