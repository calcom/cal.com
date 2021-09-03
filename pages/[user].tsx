import Avatar from "@components/Avatar";
import { HeadSeo } from "@components/seo/head-seo";
import Theme from "@components/Theme";
import { ArrowRightIcon } from "@heroicons/react/outline";
import { ClockIcon, CurrencyDollarIcon, InformationCircleIcon, UserIcon } from "@heroicons/react/solid";
import formatCurrency from "@lib/formatCurrency";
import prisma from "@lib/prisma";
import serverSideErrorHandler from "@lib/serverSideErrorHandler";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import Link from "next/link";
import React from "react";

export default function User(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { isReady } = Theme(props.user.theme || undefined);

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
            {type.price && (
              <div className="flex text-sm text-neutral-500">
                <CurrencyDollarIcon
                  className="flex-shrink-0 mt-0.5 mr-1.5 h-4 w-4 text-neutral-400 dark:text-white"
                  aria-hidden="true"
                />
                <p className="dark:text-white">{formatCurrency(type.price)}</p>
              </div>
            )}
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
      <HeadSeo
        title={props.user.name || props.user.username}
        description={props.user.name || props.user.username}
        name={props.user.name || props.user.username}
        avatar={props.user.avatar}
      />
      {isReady && (
        <div className="h-screen bg-neutral-50 dark:bg-black">
          <main className="max-w-3xl px-4 py-24 mx-auto">
            <div className="mb-8 text-center">
              <Avatar
                imageSrc={props.user.avatar || ""}
                displayName={props.user.name || ""}
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

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        username: (context.query.user as string).toLowerCase(),
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

    if (!user) throw "notFound";

    const eventTypes = await prisma.eventType.findMany({
      where: {
        userId: user.id,
        hidden: false,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        length: true,
        price: true,
        description: true,
      },
    });

    if (!eventTypes) throw "notFound";

    return {
      props: {
        user,
        eventTypes,
      },
    };
  } catch (error) {
    return serverSideErrorHandler(error);
  }
};

// Auxiliary methods
export function getRandomColorCode(): string {
  let color = "#";
  for (let idx = 0; idx < 6; idx++) {
    color += Math.floor(Math.random() * 10);
  }
  return color;
}
