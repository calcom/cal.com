import { UserPlan } from "@prisma/client";
import classNames from "classnames";
import { GetServerSidePropsContext } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect } from "react";

import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { CAL_URL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/getPlaceholderAvatar";
import useTheme from "@calcom/lib/hooks/useTheme";
import { getTeamWithMembers } from "@calcom/lib/server/queries/teams";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import Button from "@calcom/ui/Button";
import { Icon } from "@calcom/ui/Icon";

import { useExposePlanGlobally } from "@lib/hooks/useExposePlanGlobally";
import { useLocale } from "@lib/hooks/useLocale";
import { useToggleQuery } from "@lib/hooks/useToggleQuery";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import EventTypeDescription from "@components/eventtype/EventTypeDescription";
import { HeadSeo } from "@components/seo/head-seo";
import Team from "@components/team/screens/Team";
import Avatar from "@components/ui/Avatar";
import AvatarGroup from "@components/ui/AvatarGroup";

export type TeamPageProps = inferSSRProps<typeof getServerSideProps>;
function TeamPage({ team }: TeamPageProps) {
  useTheme();
  const showMembers = useToggleQuery("members");
  const { t } = useLocale();
  useExposePlanGlobally("PRO");
  const isEmbed = useIsEmbed();
  const telemetry = useTelemetry();
  const router = useRouter();

  useEffect(() => {
    telemetry.event(
      telemetryEventTypes.pageView,
      collectPageParameters("/team/[slug]", { isTeamBooking: true })
    );
  }, [telemetry, router.asPath]);

  const eventTypes = (
    <ul className="space-y-3">
      {team.eventTypes.map((type) => (
        <li
          key={type.id}
          className={classNames(
            "hover:border-brand group relative rounded-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600",
            isEmbed ? "" : "bg-white"
          )}>
          <Icon.FiArrowRight className="absolute right-3 top-3 h-4 w-4 text-black opacity-0 transition-opacity group-hover:opacity-100 dark:text-white" />
          <Link href={`${team.slug}/${type.slug}`}>
            <a className="flex justify-between p-5">
              <div className="flex-shrink">
                <h2 className="font-cal font-semibold text-neutral-900 dark:text-white">{type.title}</h2>
                <EventTypeDescription className="text-sm" eventType={type} />
              </div>
              <div className="mt-1 self-center">
                <AvatarGroup
                  border="border-2 border-white dark:border-neutral-800"
                  truncateAfter={4}
                  className="flex flex-shrink-0"
                  size={10}
                  items={type.users.map((user) => ({
                    alt: user.name || "",
                    title: user.name || "",
                    image: CAL_URL + "/" + user.username + "/avatar.png" || "",
                  }))}
                />
              </div>
            </a>
          </Link>
        </li>
      ))}
    </ul>
  );

  const teamName = team.name || "Nameless Team";

  return (
    <div>
      <HeadSeo title={teamName} description={teamName} />
      <div className="rounded-md bg-gray-100 px-4 pt-24 pb-12 dark:bg-gray-900">
        <div className="max-w-96 mx-auto mb-8 text-center">
          <Avatar
            alt={teamName}
            imageSrc={getPlaceholderAvatar(team.logo, team.name)}
            className="mx-auto mb-4 h-20 w-20 rounded-full"
          />
          <p className="font-cal mb-2 text-3xl tracking-wider text-gray-900 dark:text-white">{teamName}</p>
          <p className="mt-2 text-sm font-normal text-neutral-500 dark:text-white">{team.bio}</p>
        </div>
        {(showMembers.isOn || !team.eventTypes.length) && <Team team={team} />}
        {!showMembers.isOn && team.eventTypes.length > 0 && (
          <div className="mx-auto max-w-3xl">
            {eventTypes}
            <div className="relative mt-12">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-gray-100 px-2 text-sm text-gray-500 dark:bg-gray-900 dark:text-white">
                  {t("or")}
                </span>
              </div>
            </div>

            <aside className="mt-8 text-center dark:text-white">
              <Button
                color="secondary"
                EndIcon={Icon.FiArrowRight}
                href={`/team/${team.slug}?members=1`}
                shallow={true}>
                {t("book_a_team_member")}
              </Button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const slug = Array.isArray(context.query?.slug) ? context.query.slug.pop() : context.query.slug;

  const team = await getTeamWithMembers(undefined, slug);

  if (!team) return { notFound: true };

  const members = team.members.filter((member) => member.plan !== UserPlan.FREE);

  team.members = members ?? [];

  team.eventTypes = team.eventTypes.map((type) => ({
    ...type,
    users: type.users.map((user) => ({
      ...user,
      avatar: CAL_URL + "/" + user.username + "/avatar.png",
    })),
  }));

  return {
    props: {
      team,
    },
  };
};

export default TeamPage;
TeamPage.isThemeSupported = true;
