import { InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { HeadSeo } from "@components/seo/head-seo";
import Theme from "@components/Theme";
import { ArrowRightIcon } from "@heroicons/react/solid";
import prisma from "@lib/prisma";
import Avatar from "@components/Avatar";
import Text from "@components/ui/Text";
import React from "react";
import { defaultAvatarSrc } from "@lib/profile";
import EventTypeDescription from "@components/eventtype/EventTypeDescription";
import classNames from "@lib/classNames";
import Team from "@components/team/screens/Team";
import { useToggleQuery } from "@lib/hooks/useToggleQuery";

function TeamPage({ team }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { isReady } = Theme();
  const showMembers = useToggleQuery("members");

  const eventTypes = (
    <ul className="space-y-3">
      {team.eventTypes.map((type) => (
        <li
          key={type.id}
          className="group relative dark:bg-neutral-900 dark:border-0 dark:hover:border-neutral-600 bg-white hover:bg-gray-50 border border-neutral-200 hover:border-black rounded-sm">
          <ArrowRightIcon className="absolute transition-opacity h-4 w-4 right-3 top-3 text-black dark:text-white opacity-0 group-hover:opacity-100" />
          <Link href={`${team.slug}/${type.slug}`}>
            <a className="block px-6 py-4 flex items-center">
              <div className="flex-shrink">
                <h2 className="font-semibold text-neutral-900 dark:text-white">{type.title}</h2>
                <EventTypeDescription className="text-sm" eventType={type} />
              </div>
              <ul className="inline-flex flex-none">
                {type.users.map((user, idx: number) => (
                  <li className={classNames(idx && "-ml-3", "w-10 h-10")} key={user.id}>
                    <Avatar displayName={user.name} imageSrc={user.avatar} />
                  </li>
                ))}
              </ul>
            </a>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    isReady && (
      <div>
        <HeadSeo title={team.name} description={team.name} />
        <div className="pt-24 pb-12 px-4">
          <div className="mb-8 text-center">
            <Avatar
              displayName={team.name}
              imageSrc={team.logo}
              className="mx-auto w-20 h-20 rounded-full mb-4"
            />
            <Text variant="headline">{team.name}</Text>
          </div>
          {(showMembers.isOn || !team.eventTypes.length) && <Team team={team} />}
          {!showMembers.isOn && team.eventTypes.length && (
            <div className="mx-auto max-w-3xl">
              {eventTypes}
              <aside className="text-center dark:text-white mt-8">
                <Link href={`/team/${team.slug}?members=1`} shallow={true}>
                  <a>
                    Book a team member <ArrowRightIcon className="h-6 w-6 inline text-neutral-500" />
                  </a>
                </Link>
              </aside>
            </div>
          )}
        </div>
      </div>
    )
  );
}

export const getServerSideProps = async (context) => {
  const slug = Array.isArray(context.query?.slug) ? context.query.slug.pop() : context.query.slug;

  const teamSelectInput = {
    id: true,
    name: true,
    slug: true,
    members: {
      select: {
        user: {
          select: {
            username: true,
            avatar: true,
            name: true,
            id: true,
            bio: true,
          },
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
        users: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true,
          },
        },
      },
    },
  };

  const team = await prisma.team.findUnique({
    where: {
      slug,
    },
    select: teamSelectInput,
  });

  if (!team) {
    return {
      notFound: true,
    };
  }

  team.eventTypes = team.eventTypes.map((type) => ({
    ...type,
    users: type.users.map((user) => ({
      ...user,
      avatar: user.avatar || defaultAvatarSrc({ email: user.email }),
    })),
  }));

  return {
    props: {
      team,
    },
  };
};

export default TeamPage;
