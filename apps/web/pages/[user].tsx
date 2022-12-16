import { GetServerSidePropsContext } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { TeamPageProps } from "pages/team/[slug]";
import { useEffect } from "react";

import {
  sdkActionManager,
  useEmbedNonStylesConfig,
  useEmbedStyles,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import CustomBranding from "@calcom/lib/CustomBranding";
import { CAL_URL } from "@calcom/lib/constants";
import defaultEvents, {
  getDynamicEventDescription,
  getGroupName,
  getUsernameList,
  getUsernameSlugLink,
} from "@calcom/lib/defaultEvents";
import { getPlaceholderAvatar } from "@calcom/lib/getPlaceholderAvatar";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import prisma from "@calcom/prisma";
import { baseEventTypeSelect } from "@calcom/prisma/selects";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import {
  BadgeCheckIcon,
  EventTypeDescriptionLazy as EventTypeDescription,
  Icon,
  Avatar,
  Button,
} from "@calcom/ui";

import { useToggleQuery } from "@lib/hooks/useToggleQuery";
import { inferSSRProps } from "@lib/types/inferSSRProps";
import { EmbedProps } from "@lib/withEmbedSsr";

import Team from "@components/team/screens/Team";
import AvatarGroup from "@components/ui/AvatarGroup";
import { AvatarSSR } from "@components/ui/AvatarSSR";

import { ssrInit } from "@server/lib/ssr";

import EmptyPage from "../../../packages/features/eventtypes/components/EmptyPage";

const HeadSeo = dynamic(() => import("@components/seo/head-seo"));
export default function User(props: inferSSRProps<typeof getServerSideProps> & EmbedProps) {
  const { users, profile, eventTypes, isDynamicGroup, dynamicNames, dynamicUsernames, isSingleUser } = props;
  const [user] = users; //To be used when we only have a single user, not dynamic group
  useTheme(user.theme);
  const router = useRouter();

  const isEmbed = useIsEmbed();
  const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";
  const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
  const query = { ...router.query };
  delete query.user; // So it doesn't display in the Link (and make tests fail)
  const telemetry = useTelemetry();

  useEffect(() => {
    if (top !== window) {
      //page_view will be collected automatically by _middleware.ts
      telemetry.event(telemetryEventTypes.embedView, collectPageParameters("/[user]"));
    }
  }, [telemetry, router.asPath]);
  return (
    <PublicPage
      type="user"
      userProps={{
        users,
        isSingleUser,
        shouldAlignCentrally,
        isDynamicGroup,
        dynamicNames,
        dynamicUsernames,
        profile,
        eventTypes,
        query,
      }}
    />
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

type UserPropsType = Partial<inferSSRProps<typeof getServerSideProps>> & {
  shouldAlignCentrally: boolean;
  query: {
    [x: string]: string | string[] | undefined;
  };
};
type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;

//TODO: fix types
export const PublicPage = ({
  type,
  userProps,
  teamProps,
}: {
  type: "user" | "team";
  userProps?: UserPropsType;
  teamProps?: TeamPageProps["team"];
}) => {
  const {
    users,
    isSingleUser,
    shouldAlignCentrally,
    isDynamicGroup,
    dynamicNames,
    dynamicUsernames,
    profile,
    eventTypes,
    query,
  } = userProps || {};
  const team = teamProps;
  const [user] = users || []; //To be used when we only have a single user, not dynamic group
  const { t } = useLocale();
  const isUser = type == "user";
  const nameOrUsername = user?.name || user?.username || "";
  const teamName = team?.name || "Nameless Team";
  const isEmbed = useIsEmbed();
  const eventTypeListItemEmbedStyles = useEmbedStyles("eventTypeListItem");

  const headSeoTitle = () => {
    if (isUser) {
      return isDynamicGroup ? dynamicNames?.join(", ") : nameOrUsername;
    }
    return teamName;
  };

  const headSeoDesc = () => {
    if (isUser) {
      return isDynamicGroup
        ? `Book events with ${dynamicUsernames?.join(", ")}`
        : (user?.bio as string) || "";
    }
    return teamName;
  };

  const headSeoName = isDynamicGroup ? dynamicNames?.join(", ") : nameOrUsername;
  const headSeoUsername = isDynamicGroup ? dynamicUsernames?.join(", ") : (user?.username as string) || "";
  const showMembers = useToggleQuery("members");

  const Main = ({ children }: React.PropsWithChildren) => {
    return (
      <div
        className={`${isEmbed ? "max-w-3xl" : ""} ${
          shouldAlignCentrally ? "mx-auto" : ""
        } dark:bg-darkgray-50 h-screen rounded-md bg-gray-100 px-4 py-24`}>
        <div
          className={`${
            isEmbed
              ? "border-bookinglightest  dark:bg-darkgray-50 rounded-md border bg-white sm:dark:border-gray-600"
              : ""
          } mx-auto max-w-3xl`}>
          {children}
        </div>
      </div>
    );
  };

  const Header = () => {
    return (
      <div className={`mb-8 text-center ${isUser && isSingleUser ? "" : "max-w-96 mx-auto"}`}>
        {isUser && isSingleUser ? (
          <>
            <AvatarSSR user={user} className="mx-auto mb-4 h-24 w-24" alt={nameOrUsername} />
            <h1 className="font-cal mb-1 text-3xl text-neutral-900 dark:text-white">
              {nameOrUsername}
              {user?.verified && (
                <BadgeCheckIcon className="mx-1 -mt-1 inline h-6 w-6 text-blue-500 dark:text-white" />
              )}
            </h1>
            <p className="dark:text-darkgray-600 text-s text-neutral-500">{user?.bio}</p>
          </>
        ) : (
          <>
            <Avatar
              alt={teamName}
              imageSrc={getPlaceholderAvatar(team?.logo, team?.name as string)}
              size="lg"
            />
            <p className="font-cal dark:text-darkgray-900 mb-2 text-2xl tracking-wider text-gray-900">
              {teamName}
            </p>
            <p className="dark:text-darkgray-500 mt-2 text-sm font-normal text-gray-500">{team?.bio}</p>
          </>
        )}
      </div>
    );
  };

  const BookTeamMember = () => (
    <>
      <div className="relative mt-12">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="dark:border-darkgray-300 w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="dark:bg-darkgray-50 bg-gray-100 px-2 text-sm text-gray-500 dark:text-white">
            {t("or")}
          </span>
        </div>
      </div>
      <aside className="mt-8 mb-16 flex justify-center text-center dark:text-white">
        <Button
          color="minimal"
          EndIcon={Icon.FiArrowRight}
          className="dark:hover:bg-darkgray-200"
          href={`/team/${team?.slug}?members=1`}
          shallow={true}>
          {t("book_a_team_member")}
        </Button>
      </aside>
    </>
  );

  const EventTypes = ({
    types,
    grouped,
  }: {
    types: UserPropsType["eventTypes"] | TeamPageProps["team"]["eventTypes"];
    grouped?: boolean;
  }) => {
    const getAvatarGroupItems = (
      isUser: boolean,
      type?: ArrayElement<TeamPageProps["team"]["eventTypes"]>
    ): { alt: string; title: string; image: string }[] | { alt: string; image: string }[] => {
      if (!isUser && type) {
        return type.users?.map((user) => ({
          alt: user?.name || "",
          title: user?.name || "",
          image: CAL_URL + "/" + user?.username + "/avatar.png" || "",
        }));
      }

      return (
        users?.map((user) => ({
          alt: user.name || "",
          image: user.avatar || "",
        })) || []
      );
    };

    return (
      <ul>
        {types?.map((type) => (
          <li
            key={type.id}
            style={isUser && !grouped ? { display: "flex", ...eventTypeListItemEmbedStyles } : undefined}
            className={`dark:bg-darkgray-100 dark:border-darkgray-200 dark:hover:border-neutral-600" group relative rounded-sm border border-neutral-200 bg-white ${
              isUser && !grouped
                ? "border-b first:rounded-t-md last:rounded-b-md last:border-b-0 hover:bg-gray-50 dark:border-neutral-700"
                : `hover:bg-gray-50 ${!isEmbed && "bg-white"}`
            }`}>
            <Icon.FiArrowRight
              className={`absolute h-4 w-4 text-black opacity-0 transition-opacity group-hover:opacity-100 dark:text-white ${
                isUser && grouped ? "right-3 top-3" : "right-4 top-4"
              }`}
            />
            {/* Don't prefetch till the time we drop the amount of javascript in [user][type] page which is impacting score for [user] page */}
            <Link
              prefetch={false}
              href={
                isUser && grouped && users
                  ? getUsernameSlugLink({ users, slug: type.slug })
                  : isUser && !grouped
                  ? { pathname: `/${user.username}/${type.slug}`, query }
                  : `${team?.slug}/${type.slug}`
              }>
              <a
                className={`${
                  !isUser ? "flex justify-between px-6 py-4" : isUser && !grouped ? "block w-full p-5" : ""
                }`}
                data-testid="event-type-link"
                onClick={async () => {
                  grouped &&
                    sdkActionManager?.fire("eventTypeSelected", {
                      eventType: type,
                    });
                }}>
                <div className="flex-shrink">
                  {grouped && isUser && (
                    <p className="dark:text-darkgray-700 text-sm font-semibold text-neutral-900">
                      {type.title}
                    </p>
                  )}
                  {!grouped && (
                    <>
                      <h2
                        className={`dark:text-darkgray-700 text-sm font-semibold text-gray-700 ${
                          isUser ? "pr-2" : ""
                        }`}>
                        {type.title}
                      </h2>
                    </>
                  )}
                  <EventTypeDescription className={`${!isUser ? "text-sm" : ""}`} eventType={type} />
                </div>
                {(isUser && grouped) ||
                  (!isUser && (
                    <div className="mt-1 self-center">
                      <AvatarGroup
                        border={`${
                          !isUser ? "border-2 border-white dark:border-darkgray-100" : "border-2 border-white"
                        }`}
                        truncateAfter={4}
                        className="flex flex-shrink-0"
                        size={10}
                        items={
                          !isUser
                            ? getAvatarGroupItems(
                                isUser,
                                type as ArrayElement<TeamPageProps["team"]["eventTypes"]>
                              )
                            : getAvatarGroupItems(isUser)
                        }
                      />
                    </div>
                  ))}
              </a>
            </Link>
          </li>
        ))}
      </ul>
    );
  };

  const UserAway = () => (
    <div className="overflow-hidden rounded-sm border dark:border-gray-900">
      <div className="p-8 text-center text-gray-400 dark:text-white">
        <h2 className="font-cal mb-2 text-3xl text-gray-600 dark:text-white">😴{" " + t("user_away")}</h2>
        <p className="mx-auto max-w-md">{t("user_away_description")}</p>
      </div>
    </div>
  );

  const groupEventTypes = users?.some((user) => !user.allowDynamicBooking) ? (
    <div className="space-y-6" data-testid="event-types">
      <div className="overflow-hidden rounded-sm border dark:border-gray-900">
        <div className="p-8 text-center text-gray-400 dark:text-white">
          <h2 className="font-cal mb-2 text-3xl text-gray-600 dark:text-white">{" " + t("unavailable")}</h2>
          <p className="mx-auto max-w-md">{t("user_dynamic_booking_disabled")}</p>
        </div>
      </div>
    </div>
  ) : (
    <EventTypes grouped types={eventTypes} />
  );

  const getEventTypes = (isUser: boolean) => {
    if (isUser) {
      return user.away ? <UserAway /> : isDynamicGroup ? groupEventTypes : <EventTypes types={eventTypes} />;
    }
    return <EventTypes types={team?.eventTypes} />;
  };

  const EventTypesList = () => {
    return (
      <div
        className={`rounded-md border ${
          isUser
            ? "border-neutral-200 dark:border-neutral-700 dark:hover:border-neutral-600"
            : " dark:border-darkgray-300"
        }`}
        data-testid="event-types">
        {getEventTypes(isUser)}
      </div>
    );
  };

  return (
    <>
      <HeadSeo
        title={headSeoTitle() || ""}
        description={headSeoDesc()}
        name={headSeoName}
        username={headSeoUsername}
        // avatar={user.avatar || undefined}
      />
      {isUser && <CustomBranding lightVal={profile?.brandColor} darkVal={profile?.darkBrandColor} />}
      <Main>
        <Header />
        {!isUser && team && (showMembers.isOn || !team.eventTypes.length) && <Team team={team} />}
        {!isUser && team && !showMembers.isOn && team.eventTypes.length > 0 && (
          <div className="mx-auto max-w-3xl ">
            <EventTypesList />
            <BookTeamMember />
          </div>
        )}
        {isUser && Number(eventTypes?.length) > 0 && <EventTypesList />}
        {isUser && eventTypes?.length === 0 && <EmptyPage name={user.name ?? "User"} />}
      </Main>
    </>
  );
};
