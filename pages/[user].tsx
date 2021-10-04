import { ArrowRightIcon } from "@heroicons/react/outline";
import { ssg } from "@server/ssg";
import { GetStaticPaths, GetStaticPropsContext, InferGetStaticPropsType } from "next";
import Link from "next/link";
import React from "react";

import useTheme from "@lib/hooks/useTheme";
import prisma from "@lib/prisma";
import { trpc } from "@lib/trpc";

import EventTypeDescription from "@components/eventtype/EventTypeDescription";
import { HeadSeo } from "@components/seo/head-seo";
import Avatar from "@components/ui/Avatar";

export default function User(props: InferGetStaticPropsType<typeof getStaticProps>) {
  const { username } = props;
  // data of query below will be will be prepopulated b/c of `getStaticProps`
  const query = trpc.useQuery(["booking.userEventTypes", { username }]);
  const { isReady } = useTheme(query.data?.user.theme);
  if (!query.data) {
    // this shold never happen as we do `blocking: true`
    return <>...</>;
  }
  const { user, eventTypes } = query.data;

  return (
    <>
      <HeadSeo
        title={user.name || user.username}
        description={user.name || user.username}
        name={user.name || user.username}
        avatar={user.avatar}
      />
      {isReady && (
        <div className="h-screen bg-neutral-50 ">
          <main className="max-w-3xl px-4 py-24 mx-auto">
            <div className="mb-8 text-center">
              <Avatar
                imageSrc={user.avatar}
                displayName={user.name}
                className="w-24 h-24 mx-auto mb-4 rounded-full"
              />
              <h1 className="mb-1 text-3xl font-bold font-cal text-neutral-900 ">
                {user.name || user.username}
              </h1>
              <p className="text-neutral-500 ">{user.bio}</p>
            </div>
            <div className="space-y-6" data-testid="event-types">
              {eventTypes.map((type) => (
                <div
                  key={type.id}
                  className="relative bg-white border rounded-sm group :border-neutral-600 hover:bg-gray-50 border-neutral-200 hover:border-black">
                  <ArrowRightIcon className="absolute w-4 h-4 text-black transition-opacity opacity-0 right-3 top-3 group-hover:opacity-100" />
                  <Link href={`/${user.username}/${type.slug}`}>
                    <a className="block px-6 py-4">
                      <h2 className="font-semibold text-neutral-900 ">{type.title}</h2>
                      <EventTypeDescription asyncUseCalendar={user.asyncUseCalendar} eventType={type} />
                    </a>
                  </Link>
                </div>
              ))}
            </div>
            {eventTypes.length === 0 && (
              <div className="overflow-hidden rounded-sm shadow">
                <div className="p-8 text-center text-gray-400 ">
                  <h2 className="text-3xl font-semibold text-gray-600 font-cal ">Uh oh!</h2>
                  <p className="max-w-md mx-auto">This user hasn&apos;t set up any event types yet.</p>
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
  const allUsers = await prisma.user.findMany({
    select: {
      username: true,
    },
    where: {
      // will statically render everyone on the PRO plan
      // the rest will be statically rendered on first visit
      plan: "PRO",
    },
  });
  const usernames = allUsers.flatMap((u) => (u.username ? [u.username] : []));
  return {
    paths: usernames.map((user) => ({
      params: { user },
    })),

    // https://nextjs.org/docs/basic-features/data-fetching#fallback-blocking
    fallback: "blocking",
  };
};

export async function getStaticProps(context: GetStaticPropsContext<{ user: string }>) {
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
