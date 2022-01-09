import { ArrowRightIcon } from "@heroicons/react/solid";
import { GetServerSidePropsContext } from "next";
import Link from "next/link";
import React from "react";

import { getPlaceholderAvatar } from "@lib/getPlaceholderAvatar";
import { useLocale } from "@lib/hooks/useLocale";
import useTheme from "@lib/hooks/useTheme";
import { useToggleQuery } from "@lib/hooks/useToggleQuery";
import { defaultAvatarSrc } from "@lib/profile";
import { getTeamWithMembers } from "@lib/queries/teams";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import EventTypeDescription from "@components/eventtype/EventTypeDescription";
import { HeadSeo } from "@components/seo/head-seo";
import Team from "@components/team/screens/Team";
import Avatar from "@components/ui/Avatar";
import AvatarGroup from "@components/ui/AvatarGroup";
import Button from "@components/ui/Button";
import Text from "@components/ui/Text";

export type TeamPageProps = inferSSRProps<typeof getServerSideProps>;

function TeamPage({ team }: TeamPageProps) {
  const { isReady } = useTheme();
  const showMembers = useToggleQuery("members");
  const { t } = useLocale();

  const eventTypes = (
    <ul className="space-y-3">
      {team.eventTypes.map((type) => (
        <li
          key={type.id}
          className="relative bg-white border rounded-sm group dark:bg-neutral-900 dark:border-0 dark:hover:border-neutral-600 hover:bg-gray-50 border-neutral-200 hover:border-brand">
          <ArrowRightIcon className="absolute w-4 h-4 text-black transition-opacity opacity-0 right-3 top-3 dark:text-white group-hover:opacity-100" />
          <Link href={`${team.slug}/${type.slug}`}>
            <a className="flex justify-between px-6 py-4">
              <div className="flex-shrink">
                <h2 className="font-semibold font-cal text-neutral-900 dark:text-white">{type.title}</h2>
                <EventTypeDescription className="text-sm" eventType={type} />
              </div>
              <div className="mt-1">
                <AvatarGroup
                  truncateAfter={4}
                  className="flex-shrink-0"
                  size={10}
                  items={type.users.map((user) => ({
                    alt: user.name || "",
                    image: user.avatar || "",
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
    isReady && (
      <div>
        <HeadSeo title={teamName} description={teamName} />
        <div className="px-4 pt-24 pb-12">
          <div className="mx-auto mb-8 text-center max-w-96">
            <Avatar
              alt={teamName}
              imageSrc={getPlaceholderAvatar(team.logo, team.name)}
              className="w-20 h-20 mx-auto mb-4 rounded-full"
            />
            <Text variant="largetitle">{teamName}</Text>
            <Text variant="subtitle" className="mt-2">
              {team.bio}
            </Text>
          </div>
          {(showMembers.isOn || !team.eventTypes.length) && <Team team={team} />}
          {!showMembers.isOn && team.eventTypes.length > 0 && (
            <div className="max-w-3xl mx-auto">
              {eventTypes}

              <div className="relative mt-12">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-200 dark:border-gray-900" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-2 text-sm text-gray-500 bg-gray-100 dark:bg-brand dark:text-brandcontrast">
                    {t("or")}
                  </span>
                </div>
              </div>

              <aside className="mt-8 text-center dark:text-white">
                <Button
                  color="secondary"
                  EndIcon={ArrowRightIcon}
                  href={`/team/${team.slug}?members=1`}
                  shallow={true}>
                  {t("book_a_team_member")}
                </Button>
              </aside>
            </div>
          )}
        </div>
      </div>
    )
  );
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const slug = Array.isArray(context.query?.slug) ? context.query.slug.pop() : context.query.slug;

  const team = await getTeamWithMembers(undefined, slug);

  if (!team) return { notFound: true };

  team.eventTypes = team.eventTypes.map((type) => ({
    ...type,
    users: type.users.map((user) => ({
      ...user,
      avatar: user.avatar || defaultAvatarSrc({ email: user.email || "" }),
    })),
  }));

  return {
    props: {
      team,
    },
  };
};

export default TeamPage;
