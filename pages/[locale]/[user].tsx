import { ArrowRightIcon } from "@heroicons/react/outline";
import { GetStaticPaths, GetStaticPropsContext } from "next";
import { i18n } from "next-i18next.config";
import Link from "next/link";
import React, { useEffect } from "react";

import { useLocale } from "@lib/hooks/useLocale";
import useTheme from "@lib/hooks/useTheme";
import prisma from "@lib/prisma";
import { trpc } from "@lib/trpc";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import Loader from "@components/Loader";
import EventTypeDescription from "@components/eventtype/EventTypeDescription";
import { HeadSeo } from "@components/seo/head-seo";
import Avatar from "@components/ui/Avatar";

import { ssgInit } from "@server/ssg";

export default function User(props: inferSSRProps<typeof getStaticProps>) {
  const { username } = props;
  const utils = trpc.useContext();

  // data of query below will be will be prepopulated b/c of `getStaticProps`
  const query = trpc.useQuery(["booking.userEventTypes", { username }]);

  const { t } = useLocale();
  const { isReady } = useTheme(query.data?.user.theme);
  useEffect(() => {
    if (!query.data) {
      return;
    }
    for (const { slug } of query.data.eventTypes) {
      utils.prefetchQuery(["booking.eventTypeByUsername", { slug, username }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);
  if (!query.data) {
    // this shold never happen as we do `blocking: true`
    // TODO check 404 pages
    return <Loader />;
  }
  const { user, eventTypes } = query.data;

  const nameOrUsername = user.name || user.username || "";
  return (
    <>
      <HeadSeo
        title={nameOrUsername}
        description={nameOrUsername}
        name={nameOrUsername}
        avatar={user.avatar || ""}
      />
      {isReady && (
        <div className="bg-neutral-50 dark:bg-black h-screen">
          <main className="max-w-3xl mx-auto py-24 px-4">
            <div className="mb-8 text-center">
              <Avatar
                imageSrc={user.avatar}
                className="mx-auto w-24 h-24 rounded-full mb-4"
                alt={nameOrUsername}
              />
              <h1 className="font-cal text-3xl font-bold text-neutral-900 dark:text-white mb-1">
                {user.name || user.username}
              </h1>
              <p className="text-neutral-500 dark:text-white">{user.bio}</p>
            </div>
            <div className="space-y-6" data-testid="event-types">
              {eventTypes.map((type) => (
                <div
                  key={type.id}
                  className="group relative dark:bg-neutral-900 dark:border-0 dark:hover:border-neutral-600 bg-white hover:bg-gray-50 border border-neutral-200 hover:border-black rounded-sm">
                  <ArrowRightIcon className="absolute transition-opacity h-4 w-4 right-3 top-3 text-black dark:text-white opacity-0 group-hover:opacity-100" />
                  <Link href={`/${user.username}/${type.slug}`}>
                    <a className="block px-6 py-4">
                      <h2 className="font-semibold text-neutral-900 dark:text-white">{type.title}</h2>
                      <EventTypeDescription eventType={type} />
                    </a>
                  </Link>
                </div>
              ))}
            </div>
            {eventTypes.length === 0 && (
              <div className="shadow overflow-hidden rounded-sm">
                <div className="p-8 text-center text-gray-400 dark:text-white">
                  <h2 className="font-cal font-semibold text-3xl text-gray-600 dark:text-white">
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

export const getStaticPaths: GetStaticPaths = async () => {
  const users = await prisma.user.findMany({
    select: {
      username: true,
      locale: true,
    },
    where: {
      // will statically render everyone on the PRO plan
      // the rest will be statically rendered on first visit
      plan: "PRO",
    },
  });
  const { defaultLocale } = i18n;
  return {
    paths: users.flatMap((user) => {
      if (!user.username) {
        return [];
      }
      // statically render english
      const paths = [
        {
          params: {
            user: user.username,
            locale: defaultLocale,
          },
        },
      ];
      // statically render user's preferred language
      if (user.locale && user.locale !== defaultLocale) {
        const locale = user.locale;
        paths.push({
          params: {
            user: user.username,
            locale,
          },
        });
      }
      return paths;
    }),

    // https://nextjs.org/docs/basic-features/data-fetching#fallback-blocking
    fallback: "blocking",
  };
};

export async function getStaticProps(context: GetStaticPropsContext<{ user: string; locale: string }>) {
  const ssg = await ssgInit(context);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const username = context.params!.user;
  const data = await ssg.fetchQuery("booking.userEventTypes", { username });

  if (!data) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      trpcState: ssg.dehydrate(),
      username,
    },
    revalidate: 1,
  };
}
