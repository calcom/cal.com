import classNames from "classnames";
import MarkdownIt from "markdown-it";
import { GetServerSidePropsContext } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";

import {
  sdkActionManager,
  useEmbedNonStylesConfig,
  useEmbedStyles,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import { EventTypeDescriptionLazy as EventTypeDescription } from "@calcom/features/eventtypes/components";
import EmptyPage from "@calcom/features/eventtypes/components/EmptyPage";
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
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { HeadSeo, AvatarGroup, Avatar } from "@calcom/ui";
import { BadgeCheckIcon, FiArrowRight } from "@calcom/ui/components/icon";

import { inferSSRProps } from "@lib/types/inferSSRProps";
import { EmbedProps } from "@lib/withEmbedSsr";

import { ssrInit } from "@server/lib/ssr";

const md = new MarkdownIt("default", { html: true, breaks: true, linkify: true });

export default function User(props: inferSSRProps<typeof getServerSideProps> & EmbedProps) {
  const { users, profile, eventTypes, isDynamicGroup, dynamicNames, dynamicUsernames, isSingleUser } = props;
  const [user] = users; //To be used when we only have a single user, not dynamic group
  useTheme(user.theme);
  const { t } = useLocale();
  const router = useRouter();

  const isBioEmpty = !user.bio || !user.bio.replace("<p><br></p>", "").length;

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
    <ul>
      {eventTypes.map((type, index) => (
        <li
          key={index}
          className="dark:bg-darkgray-100 group relative border-b border-gray-200 bg-white first:rounded-t-md last:rounded-b-md last:border-b-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600">
          <FiArrowRight className="absolute right-3 top-3 h-4 w-4 text-black opacity-0 transition-opacity group-hover:opacity-100 dark:text-white" />
          <Link
            href={getUsernameSlugLink({ users: props.users, slug: type.slug })}
            className="flex justify-between px-6 py-4"
            data-testid="event-type-link">
            <div className="flex-shrink">
              <p className="dark:text-darkgray-700 text-sm font-semibold text-gray-900">{type.title}</p>
              <EventTypeDescription className="text-sm" eventType={type} />
            </div>
            <div className="mt-1 self-center">
              <AvatarGroup
                truncateAfter={4}
                className="flex flex-shrink-0"
                size="sm"
                items={props.users.map((user) => ({
                  alt: user.name || "",
                  image: user.avatar || "",
                }))}
              />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );

  const isEmbed = useIsEmbed(props.isEmbed);
  const eventTypeListItemEmbedStyles = useEmbedStyles("eventTypeListItem");
  const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";
  const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
  const query = { ...router.query };
  delete query.user; // So it doesn't display in the Link (and make tests fail)
  const nameOrUsername = user.name || user.username || "";
  const telemetry = useTelemetry();

  useEffect(() => {
    if (top !== window) {
      //page_view will be collected automatically by _middleware.ts
      telemetry.event(telemetryEventTypes.embedView, collectPageParameters("/[user]"));
    }
  }, [telemetry, router.asPath]);
  const isEventListEmpty = eventTypes.length === 0;
  return (
    <>
      <HeadSeo
        title={isDynamicGroup ? dynamicNames.join(", ") : nameOrUsername}
        description={
          isDynamicGroup ? `Book events with ${dynamicUsernames.join(", ")}` : (user.bio as string) || ""
        }
        meeting={{
          title: isDynamicGroup ? "" : `${user.bio}`,
          profile: { name: `${profile.name}`, image: null },
          users: isDynamicGroup
            ? dynamicUsernames.map((username, index) => ({ username, name: dynamicNames[index] }))
            : [{ username: `${user.username}`, name: `${user.name}` }],
        }}
      />
      <CustomBranding lightVal={profile.brandColor} darkVal={profile.darkBrandColor} />

      <div
        className={classNames(
          shouldAlignCentrally ? "mx-auto" : "",
          isEmbed ? "max-w-3xl" : "",
          "dark:bg-darkgray-50"
        )}>
        <main
          className={classNames(
            shouldAlignCentrally ? "mx-auto" : "",
            isEmbed
              ? " border-bookinglightest  dark:bg-darkgray-50 rounded-md border bg-white sm:dark:border-gray-600"
              : "",
            "max-w-3xl py-24 px-4"
          )}>
          {isSingleUser && ( // When we deal with a single user, not dynamic group
            <div className="mb-8 text-center">
              <Avatar imageSrc={user.avatar} size="xl" alt={nameOrUsername} />
              <h1 className="font-cal mb-1 text-3xl text-gray-900 dark:text-white">
                {nameOrUsername}
                {user.verified && (
                  <BadgeCheckIcon className="mx-1 -mt-1 inline h-6 w-6 text-blue-500 dark:text-white" />
                )}
              </h1>
              {!isBioEmpty && (
                <>
                  <div
                    className="dark:text-darkgray-600 text-sm text-gray-500 [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600"
                    dangerouslySetInnerHTML={{ __html: md.render(user.bio || "") }}
                  />
                </>
              )}
            </div>
          )}
          <div
            className={classNames(
              "rounded-md ",
              !isEventListEmpty && "border border-gray-200 dark:border-gray-700 dark:hover:border-gray-600"
            )}
            data-testid="event-types">
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
                  className="dark:bg-darkgray-100 group relative border-b border-gray-200 bg-white first:rounded-t-md last:rounded-b-md last:border-b-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600">
                  <FiArrowRight className="absolute right-4 top-4 h-4 w-4 text-black opacity-0 transition-opacity group-hover:opacity-100 dark:text-white" />
                  {/* Don't prefetch till the time we drop the amount of javascript in [user][type] page which is impacting score for [user] page */}
                  <Link
                    prefetch={false}
                    href={{
                      pathname: `/${user.username}/${type.slug}`,
                      query,
                    }}
                    onClick={async () => {
                      sdkActionManager?.fire("eventTypeSelected", {
                        eventType: type,
                      });
                    }}
                    className="block w-full p-5"
                    data-testid="event-type-link">
                    <div className="flex flex-wrap items-center">
                      <h2 className="dark:text-darkgray-700 pr-2 text-sm font-semibold text-gray-700">
                        {type.title}
                      </h2>
                    </div>
                    <EventTypeDescription eventType={type} />
                  </Link>
                </div>
              ))
            )}
          </div>
          {isEventListEmpty && <EmptyPage name={user.name ?? "User"} />}
        </main>
        <Toaster position="bottom-right" />
      </div>
    </>
  );
}
User.isThemeSupported = true;

const getEventTypesWithHiddenFromDB = async (userId: number) => {
  return (
    await prisma.eventType.findMany({
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
        ...baseEventTypeSelect,
        metadata: true,
      },
    })
  ).map((eventType) => ({
    ...eventType,
    metadata: EventTypeMetaDataSchema.parse(eventType.metadata),
  }));
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
      away: true,
      verified: true,
      allowDynamicBooking: true,
    },
  });

  if (!users.length) {
    return {
      notFound: true,
    } as {
      notFound: true;
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

  const eventTypesWithHidden = isDynamicGroup ? [] : await getEventTypesWithHiddenFromDB(user.id);
  const dataFetchEnd = Date.now();
  if (context.query.log === "1") {
    context.res.setHeader("X-Data-Fetch-Time", `${dataFetchEnd - dataFetchStart}ms`);
  }
  const eventTypesRaw = eventTypesWithHidden.filter((evt) => !evt.hidden);

  const eventTypes = eventTypesRaw.map((eventType) => ({
    ...eventType,
    metadata: EventTypeMetaDataSchema.parse(eventType.metadata || {}),
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
