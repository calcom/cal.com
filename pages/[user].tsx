import Avatar from "@components/Avatar";
import Theme from "@components/Theme";
import { ArrowRightIcon } from "@heroicons/react/outline";
import { ClockIcon, InformationCircleIcon, UserIcon } from "@heroicons/react/solid";
import prisma from "@lib/prisma";
import { Prisma } from "@prisma/client";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Head from "next/head";
import Link from "next/link";
import React from "react";

export default function User(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { isReady } = Theme(props.user.theme!);

  const eventTypes = props.eventTypes.map((type) => (
    <div
      key={type.id}
      className="relative bg-white border rounded-sm group dark:bg-neutral-900 dark:border-0 dark:hover:border-neutral-600 hover:bg-gray-50 border-neutral-200 hover:border-black">
      <ArrowRightIcon className="absolute w-4 h-4 text-black transition-opacity opacity-0 right-3 top-3 dark:text-white group-hover:opacity-100" />
      <Link href={`/${props.user.username}/${type.slug}`}>
        <a className="block px-6 py-4">
          <h2 className="font-semibold text-neutral-900 dark:text-white">{type.title}</h2>
          <div className="flex mt-2 space-x-4">
            <div className="flex text-sm text-neutral-500">
              <ClockIcon
                className="flex-shrink-0 mt-0.5 mr-1.5 h-4 w-4 text-neutral-400 dark:text-white"
                aria-hidden="true"
              />
              <p className="dark:text-white">{type.length}m</p>
            </div>
            <div className="flex text-sm min-w-16 text-neutral-500">
              <UserIcon
                className="flex-shrink-0 mt-0.5 mr-1.5 h-4 w-4 text-neutral-400 dark:text-white"
                aria-hidden="true"
              />
              <p className="dark:text-white">1-on-1</p>
            </div>
            <div className="flex text-sm text-neutral-500">
              <InformationCircleIcon
                className="flex-shrink-0 mt-0.5 mr-1.5 h-4 w-4 text-neutral-400 dark:text-white"
                aria-hidden="true"
              />
              <p className="dark:text-white">{type.description}</p>
            </div>
          </div>
        </a>
      </Link>
    </div>
  ));
  return (
    <>
      <Head>
        <title>{props.user.name || props.user.username} | Calendso</title>
        <link rel="icon" href="/favicon.ico" />

        <meta name="title" content={"Meet " + (props.user.name || props.user.username) + " via Calendso"} />
        <meta name="description" content={"Book a time with " + (props.user.name || props.user.username)} />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://a.genda.me/" />
        <meta
          property="og:title"
          content={"Meet " + (props.user.name || props.user.username) + " via Calendso"}
        />
        <meta
          property="og:description"
          content={"Book a time with " + (props.user.name || props.user.username)}
        />
        <meta
          property="og:image"
          content={
            "https://og-image-one-pi.vercel.app/" +
            encodeURIComponent("Meet **" + (props.user.name || props.user.username) + "** <br>").replace(
              /'/g,
              "%27"
            ) +
            ".png?md=1&images=https%3A%2F%2Fa.genda.me%2Fgenda-white.svg&images=" +
            encodeURIComponent(props.user.avatar ?? "")
          }
        />

        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://a.genda.me/" />
        <meta
          property="twitter:title"
          content={"Meet " + (props.user.name || props.user.username) + " via Calendso"}
        />
        <meta
          property="twitter:description"
          content={"Book a time with " + (props.user.name || props.user.username)}
        />
        <meta
          property="twitter:image"
          content={
            "https://og-image-one-pi.vercel.app/" +
            encodeURIComponent("Meet **" + (props.user.name || props.user.username) + "** <br>").replace(
              /'/g,
              "%27"
            ) +
            ".png?md=1&images=https%3A%2F%2Fa.genda.me%2Fgenda-white.svg&images=" +
            encodeURIComponent(props.user.avatar ?? "")
          }
        />
      </Head>
      {isReady && (
        <div className="h-screen bg-neutral-50 dark:bg-black">
          <main className="max-w-3xl px-4 py-24 mx-auto">
            <div className="mb-8 text-center">
              <Avatar
                imageSrc={props.user.avatar ?? ""}
                displayName={props.user.name ?? ""}
                className="w-24 h-24 mx-auto mb-4 rounded-full"
              />
              <h1 className="mb-1 text-3xl font-bold text-neutral-900 dark:text-white">
                {props.user.name || props.user.username}
              </h1>
              <p className="text-neutral-500 dark:text-white">{props.user.bio}</p>
            </div>
            <div className="space-y-6">{eventTypes}</div>
            {eventTypes.length == 0 && (
              <div className="overflow-hidden rounded-sm shadow">
                <div className="p-8 text-center text-gray-400 dark:text-white">
                  <h2 className="text-3xl font-semibold text-gray-600 dark:text-white">Uh oh!</h2>
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

async function getUser(username: string) {
  return prisma.user.findFirst({
    where: {
      username,
    },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      bio: true,
      avatar: true,
      theme: true,
    },
  });
}

async function getEventTypes(userId: number) {
  return prisma.eventType.findMany({
    where: {
      userId,
      hidden: false,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      length: true,
      description: true,
    },
  });
}

export const getServerSideProps: GetServerSideProps<{
  user: NonNullable<Prisma.PromiseReturnType<typeof getUser>>;
  eventTypes: NonNullable<Prisma.PromiseReturnType<typeof getEventTypes>>;
}> = async (context) => {
  const user = await getUser(context.query.user as string);

  if (!user) return { notFound: true } as const;

  const eventTypes = await getEventTypes(user.id);

  if (!eventTypes) return { notFound: true } as const;

  return {
    props: {
      user,
      eventTypes,
    },
  };
};

// Auxiliary methods
export function getRandomColorCode(): string {
  let color = "#";
  for (let idx = 0; idx < 6; idx++) {
    color += Math.floor(Math.random() * 10);
  }
  return color;
}
