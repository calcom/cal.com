import { ArrowRightIcon } from "@heroicons/react/solid";
import { Prisma } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import Link from "next/link";
import React from "react";

import { useLocale } from "@lib/hooks/useLocale";
import useTheme from "@lib/hooks/useTheme";
import { useToggleQuery } from "@lib/hooks/useToggleQuery";
import prisma from "@lib/prisma";
import { defaultAvatarSrc } from "@lib/profile";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import EventTypeDescription from "@components/eventtype/EventTypeDescription";
import { HeadSeo } from "@components/seo/head-seo";
import Team from "@components/team/screens/Team";
import Avatar from "@components/ui/Avatar";
import AvatarGroup from "@components/ui/AvatarGroup";
import Button from "@components/ui/Button";
import Text from "@components/ui/Text";

function TeamPage({ team }: inferSSRProps<typeof getServerSideProps>) {
  const { isReady } = useTheme();
  const showMembers = useToggleQuery("members");
  const { t } = useLocale();

  const eventTypes = (
    <ul className="space-y-3">
      {team.eventTypes.map((type) => (
        <li
          key={type.id}
          className="group relative dark:bg-neutral-900 dark:border-0 dark:hover:border-neutral-600 bg-white hover:bg-gray-50 border border-neutral-200 hover:border-black rounded-sm">
          <ArrowRightIcon className="absolute transition-opacity h-4 w-4 right-3 top-3 text-black dark:text-white opacity-0 group-hover:opacity-100" />
          <Link href={`${team.slug}/${type.slug}`}>
            <a className="px-6 py-4 flex justify-between">
              <div className="flex-shrink">
                <h2 className="font-cal font-semibold text-neutral-900 dark:text-white">{type.title}</h2>
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
        <div className="pt-24 pb-12 px-4">
          <div className="mb-8 text-center">
            <Avatar alt={teamName} imageSrc={team.logo} className="mx-auto w-20 h-20 rounded-full mb-4" />
            <Text variant="headline">{teamName}</Text>
          </div>
          {(showMembers.isOn || !team.eventTypes.length) && <Team team={team} />}
          {!showMembers.isOn && team.eventTypes.length > 0 && (
            <div className="mx-auto max-w-3xl">
              {eventTypes}

              <div className="relative mt-12">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-200 dark:border-gray-900" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-2 bg-gray-100 text-sm text-gray-500 dark:bg-black dark:text-gray-500">
                    {t("or")}
                  </span>
                </div>
              </div>

              <aside className="text-center dark:text-white mt-8">
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

  const userSelect = Prisma.validator<Prisma.UserSelect>()({
    username: true,
    avatar: true,
    email: true,
    name: true,
    id: true,
    bio: true,
  });

  const teamSelect = Prisma.validator<Prisma.TeamSelect>()({
    id: true,
    name: true,
    slug: true,
    logo: true,
    members: {
      select: {
        user: {
          select: userSelect,
        },
      },
    },
    eventTypes: {
      where: {
        hidden: false,
      },
      select: {
        id: true,
        title: true,
        description: true,
        length: true,
        slug: true,
        schedulingType: true,
        price: true,
        currency: true,
        users: {
          select: userSelect,
        },
      },
    },
  });

  const team = await prisma.team.findUnique({
    where: {
      slug,
    },
    select: teamSelect,
  });

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
