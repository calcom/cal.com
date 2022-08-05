import { UserPlan } from "@prisma/client";
import classNames from "classnames";
import { GetServerSidePropsContext } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { JSONObject } from "superjson/dist/types";

import {
  sdkActionManager,
  useEmbedNonStylesConfig,
  useEmbedStyles,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import type { CryptoSectionProps } from "@calcom/features/ee/web3/components/CryptoSection";
import CustomBranding from "@calcom/lib/CustomBranding";
import defaultEvents, {
  getDynamicEventDescription,
  getGroupName,
  getUsernameList,
  getUsernameSlugLink,
} from "@calcom/lib/defaultEvents";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import prisma from "@calcom/prisma";
import { baseEventTypeSelect } from "@calcom/prisma/selects";
import { BadgeCheckIcon, Icon } from "@calcom/ui/Icon";

import { useExposePlanGlobally } from "@lib/hooks/useExposePlanGlobally";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import AvatarGroup from "@components/ui/AvatarGroup";
import { AvatarSSR } from "@components/ui/AvatarSSR";

import { ssrInit } from "@server/lib/ssr";

const EventTypeDescription = dynamic(() => import("@components/eventtype/EventTypeDescription"));
const HeadSeo = dynamic(() => import("@components/seo/head-seo"));
const CryptoSection = dynamic<CryptoSectionProps>(
  () => import("@calcom/features/ee/web3/components/CryptoSection")
);

interface EvtsToVerify {
  [evtId: string]: boolean;
}

export default function User(props: inferSSRProps<typeof getServerSideProps>) {
  const { users, profile, eventTypes, isDynamicGroup, dynamicNames, dynamicUsernames, isSingleUser } = props;
  const [user] = users; //To be used when we only have a single user, not dynamic group
  useTheme(user.theme);
  const { t } = useLocale();
  const router = useRouter();

  const groupEventTypes = props.users.some((user) => !user.allowDynamicBooking) ? (
    <div className="space-y-6" data-testid="event-types">
      <div className="overflow-hidden rounded-sm border dark:border-gray-900">
        <div className="p-8 text-center text-gray-400 dark:text-white">
          <h2 className="font-cal mb-2 text-3xl text-gray-600 dark:text-white">{" " + t("unavailable")}</h2>
          <p className="mx-auto max-w-md">{t("user_dynamic_booking_disabled") as string}</p>
        </div>
      </div>
    </div>
  ) : (
    <ul className="space-y-3">
      {eventTypes.map((type, index) => (
        <li
          key={index}
          className="hover:border-brand group relative rounded-sm border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-gray-800 dark:hover:border-neutral-600">
          <Icon.FiArrowRight className="absolute right-3 top-3 h-4 w-4 text-black opacity-0 transition-opacity group-hover:opacity-100 dark:text-white" />
          <Link href={getUsernameSlugLink({ users: props.users, slug: type.slug })}>
            <a className="flex justify-between px-6 py-4" data-testid="event-type-link">
              <div className="flex-shrink">
                <h2 className="font-cal font-semibold text-neutral-900 dark:text-white">{type.title}</h2>
                <EventTypeDescription className="text-sm" eventType={type} />
              </div>
              <div className="mt-1 self-center">
                <AvatarGroup
                  border="border-2 border-white"
                  truncateAfter={4}
                  className="flex flex-shrink-0"
                  size={10}
                  items={props.users.map((user) => ({
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

  const isEmbed = useIsEmbed();
  const eventTypeListItemEmbedStyles = useEmbedStyles("eventTypeListItem");
  const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";
  const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
  const query = { ...router.query };
  delete query.user; // So it doesn't display in the Link (and make tests fail)
  useExposePlanGlobally("PRO");
  const nameOrUsername = user.name || user.username || "";
  const [evtsToVerify, setEvtsToVerify] = useState<EvtsToVerify>({});
  const telemetry = useTelemetry();

  useEffect(() => {
    if (top !== window) {
      //page_view will be collected automatically by _middleware.ts
      telemetry.event(telemetryEventTypes.embedView, collectPageParameters("/[user]"));
    }
  }, [telemetry, router.asPath]);

  return (
    <>
      <HeadSeo
        title={isDynamicGroup ? dynamicNames.join(", ") : nameOrUsername}
        description={
          isDynamicGroup ? `Book events with ${dynamicUsernames.join(", ")}` : (user.bio as string) || ""
        }
        name={isDynamicGroup ? dynamicNames.join(", ") : nameOrUsername}
        username={isDynamicGroup ? dynamicUsernames.join(", ") : (user.username as string) || ""}
        // avatar={user.avatar || undefined}
      />
      <CustomBranding lightVal={profile.brandColor} darkVal={profile.darkBrandColor} />

      <div className={classNames(shouldAlignCentrally ? "mx-auto" : "", isEmbed ? "max-w-3xl" : "")}>
        <main
          className={classNames(
            shouldAlignCentrally ? "mx-auto" : "",
            isEmbed
              ? " border-bookinglightest  rounded-md border bg-white dark:bg-neutral-900 sm:dark:border-gray-600"
              : "",
            "max-w-3xl py-24 px-4"
          )}>
          {isSingleUser && ( // When we deal with a single user, not dynamic group
            <div className="mb-8 text-center">
              <AvatarSSR user={user} className="mx-auto mb-4 h-24 w-24" alt={nameOrUsername} />
              <h1 className="font-cal mb-1 text-3xl text-neutral-900 dark:text-white">
                {nameOrUsername}
                {user.verified && (
                  <BadgeCheckIcon className="mx-1 -mt-1 inline h-6 w-6 text-blue-500 dark:text-white" />
                )}
              </h1>
              <p className="text-neutral-500 dark:text-white">{user.bio}</p>
            </div>
          )}
          <div className="space-y-3" data-testid="event-types">
            {user.away ? (
              <div className="overflow-hidden rounded-sm border dark:border-gray-900">
                <div className="p-8 text-center text-gray-400 dark:text-white">
                  <h2 className="font-cal mb-2 text-3xl text-gray-600 dark:text-white">
                    😴{" " + t("user_away")}
                  </h2>
                  <p className="mx-auto max-w-md">{t("user_away_description") as string}</p>
                </div>
              </div>
            ) : isDynamicGroup ? ( //When we deal with dynamic group (users > 1)
              groupEventTypes
            ) : (
              eventTypes.map((type) => (
                <div
                  key={type.id}
                  style={{ display: "flex", ...eventTypeListItemEmbedStyles }}
                  className="hover:border-brand group relative rounded border border-neutral-200 bg-white hover:bg-white dark:border-neutral-700 dark:bg-gray-800 dark:hover:border-neutral-600">
                  <Icon.FiArrowRight className="absolute right-4 top-4 h-4 w-4 text-black opacity-0 transition-opacity group-hover:opacity-100 dark:text-white" />
                  {/* Don't prefetch till the time we drop the amount of javascript in [user][type] page which is impacting score for [user] page */}
                  <Link
                    prefetch={false}
                    href={{
                      pathname: `/${user.username}/${type.slug}`,
                      query,
                    }}>
                    <a
                      onClick={async (e) => {
                        // If a token is required for this event type, add a click listener that checks whether the user verified their wallet or not
                        if (type.metadata.smartContractAddress && !evtsToVerify[type.id]) {
                          const showToast = (await import("@calcom/lib/notification")).default;
                          e.preventDefault();
                          showToast(
                            "You must verify a wallet with a token belonging to the specified smart contract first",
                            "error"
                          );
                        } else {
                          sdkActionManager?.fire("eventTypeSelected", {
                            eventType: type,
                          });
                        }
                      }}
                      className="block w-full p-5"
                      data-testid="event-type-link">
                      <h2 className="grow font-semibold text-neutral-900 dark:text-white">{type.title}</h2>
                      <EventTypeDescription eventType={type} />
                    </a>
                  </Link>
                  {type.isWeb3Active && type.metadata.smartContractAddress && (
                    <CryptoSection
                      id={type.id}
                      pathname={`/${user.username}/${type.slug}`}
                      smartContractAddress={type.metadata.smartContractAddress as string}
                      verified={evtsToVerify[type.id]}
                      setEvtsToVerify={setEvtsToVerify}
                      oneStep
                    />
                  )}
                </div>
              ))
            )}
          </div>
          {eventTypes.length === 0 && (
            <div className="overflow-hidden rounded-sm border dark:border-gray-900">
              <div className="p-8 text-center text-gray-400 dark:text-white">
                <h2 className="font-cal mb-2 text-3xl text-gray-600 dark:text-white">
                  {t("uh_oh") as string}
                </h2>
                <p className="mx-auto max-w-md">{t("no_event_types_have_been_setup") as string}</p>
              </div>
            </div>
          )}
        </main>
        <Toaster position="bottom-right" />
      </div>
    </>
  );
}
User.isThemeSupported = true;

const getEventTypesWithHiddenFromDB = async (userId: number, plan: UserPlan) => {
  return await prisma.eventType.findMany({
    where: {
      AND: [
        {
          teamId: null,
        },
        {
          OR: [
            {
              userId,
            },
            {
              users: {
                some: {
                  id: userId,
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
      metadata: true,
      ...baseEventTypeSelect,
    },
    take: plan === UserPlan.FREE ? 1 : undefined,
  });
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);
  const crypto = await import("crypto");

  const usernameList = getUsernameList(context.query.user as string);
  const dataFetchStart = Date.now();
  const users = await prisma.user.findMany({
    where: {
      username: {
        in: usernameList,
      },
    },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      bio: true,
      brandColor: true,
      darkBrandColor: true,
      avatar: true,
      theme: true,
      plan: true,
      away: true,
      verified: true,
      allowDynamicBooking: true,
    },
  });

  if (!users.length) {
    return {
      notFound: true,
    };
  }
  const isDynamicGroup = users.length > 1;

  const dynamicNames = isDynamicGroup
    ? users.map((user) => {
        return user.name || "";
      })
    : [];
  const [user] = users; //to be used when dealing with single user, not dynamic group

  const profile = isDynamicGroup
    ? {
        name: getGroupName(dynamicNames),
        image: null,
        theme: null,
        weekStart: "Sunday",
        brandColor: "",
        darkBrandColor: "",
        allowDynamicBooking: !users.some((user) => {
          return !user.allowDynamicBooking;
        }),
      }
    : {
        name: user.name || user.username,
        image: user.avatar,
        theme: user.theme,
        brandColor: user.brandColor,
        darkBrandColor: user.darkBrandColor,
      };
  const usersIds = users.map((user) => user.id);
  const credentials = await prisma.credential.findMany({
    where: {
      userId: {
        in: usersIds,
      },
    },
    select: {
      id: true,
      type: true,
      key: true,
    },
  });

  const web3Credentials = credentials.find((credential) => credential.type.includes("_web3"));

  const eventTypesWithHidden = isDynamicGroup ? [] : await getEventTypesWithHiddenFromDB(user.id, user.plan);
  const dataFetchEnd = Date.now();
  if (context.query.log === "1") {
    context.res.setHeader("X-Data-Fetch-Time", `${dataFetchEnd - dataFetchStart}ms`);
  }
  const eventTypesRaw = eventTypesWithHidden.filter((evt) => !evt.hidden);

  const eventTypes = eventTypesRaw.map((eventType) => ({
    ...eventType,
    metadata: (eventType.metadata || {}) as JSONObject,
    isWeb3Active:
      web3Credentials && web3Credentials.key
        ? (((web3Credentials.key as JSONObject).isWeb3Active || false) as boolean)
        : false,
  }));

  const isSingleUser = users.length === 1;
  const dynamicUsernames = isDynamicGroup
    ? users.map((user) => {
        return user.username || "";
      })
    : [];

  return {
    props: {
      users,
      profile,
      user: {
        emailMd5: crypto.createHash("md5").update(user.email).digest("hex"),
      },
      eventTypes: isDynamicGroup
        ? defaultEvents.map((event) => {
            event.description = getDynamicEventDescription(dynamicUsernames, event.slug);
            return event;
          })
        : eventTypes,
      trpcState: ssr.dehydrate(),
      isDynamicGroup,
      dynamicNames,
      dynamicUsernames,
      isSingleUser,
    },
  };
};
