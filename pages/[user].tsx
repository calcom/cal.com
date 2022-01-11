import { ArrowRightIcon } from "@heroicons/react/outline";
import { MoonIcon } from "@heroicons/react/solid";
import { GetServerSidePropsContext } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import React from "react";

import { useLocale } from "@lib/hooks/useLocale";
import useTheme from "@lib/hooks/useTheme";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import EventTypeDescription from "@components/eventtype/EventTypeDescription";
import { HeadSeo } from "@components/seo/head-seo";
import Avatar from "@components/ui/Avatar";

import { ssrInit } from "@server/lib/ssr";

export default function User(props: inferSSRProps<typeof getServerSideProps>) {
  const { isReady } = useTheme(props.user.theme);
  const { user, eventTypes } = props;
  const { t } = useLocale();
  const router = useRouter();
  const query = { ...router.query };
  delete query.user; // So it doesn't display in the Link (and make tests fail)

  const nameOrUsername = user.name || user.username || "";

  return (
    <>
      <HeadSeo
        title={nameOrUsername}
        description={(user.bio as string) || ""}
        name={nameOrUsername}
        username={(user.username as string) || ""}
        // avatar={user.avatar || undefined}
      />
      {isReady && (
        <div className="h-screen bg-neutral-50 dark:bg-black">
          <main className="max-w-3xl px-4 py-24 mx-auto">
            <div className="mb-8 text-center">
              <Avatar
                imageSrc={user.avatar}
                className="w-24 h-24 mx-auto mb-4 rounded-full"
                alt={nameOrUsername}
              />
              <h1 className="mb-1 text-3xl font-bold font-cal text-neutral-900 dark:text-white">
                {nameOrUsername}
              </h1>
              <p className="text-neutral-500 dark:text-white">{user.bio}</p>
            </div>
            <div className="space-y-6" data-testid="event-types">
              {user.away && (
                <div className="relative px-6 py-4 bg-white border rounded-sm group dark:bg-neutral-900 dark:border-0 border-neutral-200">
                  <MoonIcon className="w-8 h-8 mb-4 text-neutral-800" />
                  <h2 className="font-semibold text-neutral-900 dark:text-white">{t("user_away")}</h2>
                  <p className="text-neutral-500 dark:text-white">{t("user_away_description")}</p>
                </div>
              )}
              {!user.away &&
                eventTypes.map((type) => (
                  <div
                    key={type.id}
                    className="relative bg-white border rounded-sm group dark:bg-neutral-900 dark:border-0 dark:hover:border-neutral-600 hover:bg-gray-50 border-neutral-200 hover:border-brand">
                    <ArrowRightIcon className="absolute w-4 h-4 text-black transition-opacity opacity-0 right-3 top-3 dark:text-white group-hover:opacity-100" />
                    <Link
                      href={{
                        pathname: `/${user.username}/${type.slug}`,
                        query,
                      }}>
                      <a className="block px-6 py-4" data-testid="event-type-link">
                        <h2 className="font-semibold text-neutral-900 dark:text-white">{type.title}</h2>
                        <EventTypeDescription eventType={type} />
                      </a>
                    </Link>
                  </div>
                ))}
            </div>
            {eventTypes.length === 0 && (
              <div className="overflow-hidden rounded-sm shadow">
                <div className="p-8 text-center text-gray-400 dark:text-white">
                  <h2 className="text-3xl font-semibold text-gray-600 font-cal dark:text-white">
                    {t("uh_oh")}
                  </h2>
                  <p className="max-w-md mx-auto">{t("no_event_types_have_been_setup")}</p>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </>
  );
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);

  const username = (context.query.user as string).toLowerCase();

  const user = await prisma.user.findUnique({
    where: {
      username: username.toLowerCase(),
    },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      bio: true,
      avatar: true,
      theme: true,
      plan: true,
      away: true,
    },
  });

  if (!user) {
    return {
      notFound: true,
    };
  }

  const eventTypesWithHidden = await prisma.eventType.findMany({
    where: {
      AND: [
        {
          teamId: null,
        },
        {
          OR: [
            {
              userId: user.id,
            },
            {
              users: {
                some: {
                  id: user.id,
                },
              },
            },
          ],
        },
      ],
    },
    orderBy: [
      {
        position: "desc",
      },
      {
        id: "asc",
      },
    ],
    select: {
      id: true,
      slug: true,
      title: true,
      length: true,
      description: true,
      hidden: true,
      schedulingType: true,
      price: true,
      currency: true,
    },
    take: user.plan === "FREE" ? 1 : undefined,
  });

  const eventTypes = eventTypesWithHidden.filter((evt) => !evt.hidden);

  return {
    props: {
      user,
      eventTypes,
      trpcState: ssr.dehydrate(),
    },
  };
};
