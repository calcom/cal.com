import { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import prisma, { whereAndSelect } from "@lib/prisma";
import Avatar from "../components/Avatar";
import Theme from "@components/Theme";
import { ClockIcon, InformationCircleIcon, UserIcon } from "@heroicons/react/solid";
import React from "react";
import { ArrowRightIcon } from "@heroicons/react/outline";

export default function User(props): User {
  const { isReady } = Theme(props.user.theme);

  const eventTypes = props.eventTypes.map((type) => (
    <div
      key={type.id}
      className="group dark:hover:border-neutral-600 relative hover:bg-gray-50 dark:bg-neutral-900 bg-white border dark:border-0 hover:border-black border-neutral-200 rounded-sm">
      <ArrowRightIcon className="absolute right-3 top-3 w-4 h-4 text-black dark:text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      <Link href={`/${props.user.username}/${type.slug}`}>
        <a className="block px-6 py-4">
          <h2 className="text-neutral-900 dark:text-white font-semibold">{type.title}</h2>
          <div className="flex mt-2 space-x-4">
            <div className="flex text-neutral-500 text-sm">
              <ClockIcon
                className="flex-shrink-0 mr-1.5 mt-0.5 w-4 h-4 text-neutral-400 dark:text-white"
                aria-hidden="true"
              />
              <p className="dark:text-white">{type.length}m</p>
            </div>
            <div className="flex min-w-16 text-neutral-500 text-sm">
              <UserIcon
                className="flex-shrink-0 mr-1.5 mt-0.5 w-4 h-4 text-neutral-400 dark:text-white"
                aria-hidden="true"
              />
              <p className="dark:text-white">1-on-1</p>
            </div>
            <div className="flex text-neutral-500 text-sm">
              <InformationCircleIcon
                className="flex-shrink-0 mr-1.5 mt-0.5 w-4 h-4 text-neutral-400 dark:text-white"
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
        <meta property="og:url" content="https://calendso/" />
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
            ".png?md=1&images=https%3A%2F%2Fcalendso.com%2Fcalendso-logo-white.svg&images=" +
            encodeURIComponent(props.user.avatar)
          }
        />

        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://calendso/" />
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
            ".png?md=1&images=https%3A%2F%2Fcalendso.com%2Fcalendso-logo-white.svg&images=" +
            encodeURIComponent(props.user.avatar)
          }
        />
      </Head>
      {isReady && (
        <div className="h-screen dark:bg-black bg-neutral-50">
          <main className="mx-auto px-4 py-24 max-w-3xl">
            <div className="mb-8 text-center">
              <Avatar user={props.user} className="mb-4 mx-auto w-24 h-24 rounded-full" />
              <h1 className="mb-1 text-neutral-900 dark:text-white text-3xl font-bold">
                {props.user.name || props.user.username}
              </h1>
              <p className="text-neutral-500 dark:text-white">{props.user.bio}</p>
            </div>
            <div className="space-y-6">{eventTypes}</div>
            {eventTypes.length == 0 && (
              <div className="rounded-sm shadow overflow-hidden">
                <div className="p-8 text-center text-gray-400 dark:text-white">
                  <h2 className="text-gray-600 text-3xl font-semibold">Uh oh!</h2>
                  <p className="mx-auto max-w-md">This user hasn&apos;t set up any event types yet.</p>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const user = await whereAndSelect(
    prisma.user.findFirst,
    {
      username: context.query.user.toLowerCase(),
    },
    ["id", "username", "email", "name", "bio", "avatar", "theme"]
  );
  if (!user) {
    return {
      notFound: true,
    };
  }

  const eventTypes = await prisma.eventType.findMany({
    where: {
      userId: user.id,
      hidden: false,
    },
    select: {
      slug: true,
      title: true,
      length: true,
      description: true,
    },
  });

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
