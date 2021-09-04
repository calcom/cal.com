import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Head from "next/head";
import Link from "next/link";
import Theme from "@components/Theme";
import { ArrowRightIcon } from "@heroicons/react/solid";
import prisma from "@lib/prisma";
import Avatar from "@components/Avatar";
import Text from "@components/ui/Text";
import React from "react";
import { defaultAvatarSrc } from "@lib/profile";
import EventTypeDescription from "@components/eventtype/EventTypeDescription";
import classNames from "@lib/classNames";

const TeamPage: InferGetServerSidePropsType<typeof getServerSideProps> = ({ team }) => {
  const { isReady } = Theme();

  const eventTypes = team.eventTypes.map((type) => (
    <div
      key={type.id}
      className="group relative dark:bg-neutral-900 dark:border-0 dark:hover:border-neutral-600 bg-white hover:bg-gray-50 border border-neutral-200 hover:border-black rounded-sm">
      <ArrowRightIcon className="absolute transition-opacity h-4 w-4 right-3 top-3 text-black dark:text-white opacity-0 group-hover:opacity-100" />
      <Link href={`${team.slug}/${type.slug}`}>
        <a className="block px-6 py-4 flex items-center">
          <div className="flex-grow">
            <h2 className="font-semibold text-neutral-900 dark:text-white">{type.title}</h2>
            <EventTypeDescription className="text-sm" eventType={type} />
          </div>
          <ul className="flex-shrink inline-flex">
            {type.organizers.map((user, idx: number) => (
              <li className={classNames(idx && "-ml-3", "w-10 h-10")} key={user.id}>
                <Avatar displayName={user.name} imageSrc={user.avatar} />
              </li>
            ))}
          </ul>
        </a>
      </Link>
    </div>
  ));

  return (
    isReady && (
      <div>
        <Head>
          <title>{team.name} | Calendso</title>
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <main className="max-w-3xl mx-auto pt-24 pb-12 px-4">
          <article className="flex flex-col space-y-8 lg:space-y-12">
            <div className="mb-8 text-center">
              <Avatar
                imageSrc={"http://placekitten.com/200/200"}
                className="mx-auto w-20 h-20 rounded-full mb-4"
              />
              <Text variant="headline">{team.name}</Text>
            </div>
            {eventTypes}
          </article>
        </main>
        <aside className="text-center dark:text-white">
          <Link href={team.slug + "/members"}>
            <a>
              Book a team member <ArrowRightIcon className="h-6 w-6 inline text-neutral-500" />
            </a>
          </Link>
        </aside>
      </div>
    )
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const teamIdOrSlug = Array.isArray(context.query?.idOrSlug)
    ? context.query.idOrSlug.pop()
    : context.query.idOrSlug;

  const teamSelectInput = {
    id: true,
    name: true,
    slug: true,
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
        organizers: {
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

  const team = await prisma.team.findFirst({
    where: {
      OR: [
        {
          id: parseInt(teamIdOrSlug) || undefined,
        },
        {
          slug: teamIdOrSlug,
        },
      ],
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
    organizers: type.organizers.map((organizer) => ({
      ...organizer,
      avatar: organizer.avatar || defaultAvatarSrc({ email: organizer.email }),
    })),
  }));

  return {
    props: {
      team,
    },
  };
};

export default TeamPage;
