import MarkdownIt from "markdown-it";
import { GetStaticPaths, GetStaticPropsContext } from "next";
import { z } from "zod";

import { privacyFilteredLocations, LocationObject } from "@calcom/app-store/locations";
import { getAppFromSlug } from "@calcom/app-store/utils";
import { IS_TEAM_BILLING_ENABLED, WEBAPP_URL } from "@calcom/lib/constants";
import { getDefaultEvent, getGroupName, getUsernameList } from "@calcom/lib/defaultEvents";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import prisma from "@calcom/prisma";
import { User } from "@calcom/prisma/client";
import {
  EventTypeMetaDataSchema,
  teamMetadataSchema,
  userMetadata as userMetadataSchema,
} from "@calcom/prisma/zod-utils";

import { isBrandingHidden } from "@lib/isBrandingHidden";
import { inferSSRProps } from "@lib/types/inferSSRProps";
import { EmbedProps } from "@lib/withEmbedSsr";

import AvailabilityPage from "@components/booking/pages/AvailabilityPage";

export type AvailabilityPageProps = inferSSRProps<typeof getStaticProps> & EmbedProps;

export default function Type(props: AvailabilityPageProps) {
  const { t } = useLocale();

  return props.away ? (
    <div className="h-screen dark:bg-gray-900">
      <main className="mx-auto max-w-3xl px-4 py-24">
        <div className="space-y-6" data-testid="event-types">
          <div className="overflow-hidden rounded-sm border dark:border-gray-900">
            <div className="p-8 text-center text-gray-400 dark:text-white">
              <h2 className="font-cal mb-2 text-3xl text-gray-600 dark:text-white">
                😴{" " + t("user_away")}
              </h2>
              <p className="mx-auto max-w-md">{t("user_away_description")}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  ) : props.isDynamic && !props.profile.allowDynamicBooking ? (
    <div className="dark:bg-darkgray-50 h-screen">
      <main className="mx-auto max-w-3xl px-4 py-24">
        <div className="space-y-6" data-testid="event-types">
          <div className="overflow-hidden rounded-sm border dark:border-gray-900">
            <div className="p-8 text-center text-gray-400 dark:text-white">
              <h2 className="font-cal mb-2 text-3xl text-gray-600 dark:text-white">
                {" " + t("unavailable")}
              </h2>
              <p className="mx-auto max-w-md">{t("user_dynamic_booking_disabled")}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  ) : (
    <AvailabilityPage {...props} />
  );
}

Type.isThemeSupported = true;

async function getUserPageProps(context: GetStaticPropsContext) {
  const { type: slug, user: username } = paramsSchema.parse(context.params);
  const { ssgInit } = await import("@server/lib/ssg");
  const ssg = await ssgInit(context);
  const user = await prisma.user.findUnique({
    where: {
      username,
    },
    select: {
      id: true,
      username: true,
      away: true,
      name: true,
      hideBranding: true,
      timeZone: true,
      theme: true,
      weekStart: true,
      brandColor: true,
      darkBrandColor: true,
      eventTypes: {
        where: {
          // Many-to-many relationship causes inclusion of the team events - cool -
          // but to prevent these from being selected, make sure the teamId is NULL.
          AND: [{ slug }, { teamId: null }],
        },
        select: {
          title: true,
          slug: true,
          hidden: true,
          recurringEvent: true,
          length: true,
          locations: true,
          id: true,
          description: true,
          price: true,
          currency: true,
          requiresConfirmation: true,
          schedulingType: true,
          metadata: true,
          seatsPerTimeSlot: true,
        },
        orderBy: [
          {
            position: "desc",
          },
          {
            id: "asc",
          },
        ],
      },
      teams: {
        include: {
          team: true,
        },
      },
    },
  });

  const md = new MarkdownIt("zero").enable([
    //
    "emphasis",
    "list",
    "newline",
    "strikethrough",
  ]);

  if (!user || !user.eventTypes.length) return { notFound: true };

  const [eventType]: (typeof user.eventTypes[number] & {
    users: Pick<User, "name" | "username" | "hideBranding" | "timeZone">[];
  })[] = [
    {
      ...user.eventTypes[0],
      users: [
        {
          name: user.name,
          username: user.username,
          hideBranding: user.hideBranding,
          timeZone: user.timeZone,
        },
      ],
    },
  ];

  if (!eventType) return { notFound: true };

  //TODO: Use zodSchema to verify it instead of using Type Assertion
  const locations = eventType.locations ? (eventType.locations as LocationObject[]) : [];
  const eventTypeObject = Object.assign({}, eventType, {
    metadata: EventTypeMetaDataSchema.parse(eventType.metadata || {}),
    recurringEvent: parseRecurringEvent(eventType.recurringEvent),
    locations: privacyFilteredLocations(locations),
    descriptionAsSafeHTML: eventType.description ? md.render(eventType.description) : null,
  });
  // Check if the user you are logging into has any active teams
  const hasActiveTeam =
    user.teams.filter((m) => {
      if (!IS_TEAM_BILLING_ENABLED) return true;
      const metadata = teamMetadataSchema.safeParse(m.team.metadata);
      if (metadata.success && metadata.data?.subscriptionId) return true;
      return false;
    }).length > 0;

  return {
    props: {
      eventType: eventTypeObject,
      profile: {
        ...eventType.users[0],
        theme: user.theme,
        allowDynamicBooking: false,
        weekStart: user.weekStart,
        brandColor: user.brandColor,
        darkBrandColor: user.darkBrandColor,
        slug: `${user.username}/${eventType.slug}`,
        image: `${WEBAPP_URL}/${user.username}/avatar.png`,
      },
      away: user?.away,
      isDynamic: false,
      trpcState: ssg.dehydrate(),
      isBrandingHidden: isBrandingHidden(user.hideBranding, hasActiveTeam),
    },
    revalidate: 10, // seconds
  };
}

async function getDynamicGroupPageProps(context: GetStaticPropsContext) {
  const { ssgInit } = await import("@server/lib/ssg");
  const ssg = await ssgInit(context);
  const { type: typeParam, user: userParam } = paramsSchema.parse(context.params);
  const usernameList = getUsernameList(userParam);
  const length = parseInt(typeParam);
  const eventType = getDefaultEvent("" + length);

  const users = await prisma.user.findMany({
    where: {
      username: {
        in: usernameList,
      },
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      bio: true,
      avatar: true,
      startTime: true,
      endTime: true,
      timeZone: true,
      weekStart: true,
      availability: true,
      hideBranding: true,
      brandColor: true,
      darkBrandColor: true,
      defaultScheduleId: true,
      allowDynamicBooking: true,
      metadata: true,
      away: true,
      schedules: {
        select: {
          availability: true,
          timeZone: true,
          id: true,
        },
      },
      theme: true,
    },
  });

  if (!users.length) {
    return {
      notFound: true,
    };
  }

  // sort and be in the same order as usernameList so first user is the first user in the list
  let sortedUsers: typeof users = [];
  if (users.length > 1) {
    sortedUsers = users.sort((a, b) => {
      const aIndex = (a.username && usernameList.indexOf(a.username)) || 0;
      const bIndex = (b.username && usernameList.indexOf(b.username)) || 0;
      return aIndex - bIndex;
    });
  }

  let locations = eventType.locations ? (eventType.locations as LocationObject[]) : [];

  // Get the prefered location type from the first user
  const firstUsersMetadata = userMetadataSchema.parse(sortedUsers[0].metadata || {});
  const preferedLocationType = firstUsersMetadata?.defaultConferencingApp;

  if (preferedLocationType?.appSlug) {
    const foundApp = getAppFromSlug(preferedLocationType.appSlug);
    const appType = foundApp?.appData?.location?.type;
    if (appType) {
      // Replace the location with the prefered location type
      // This will still be default to daily if the app is not found
      locations = [{ type: appType, link: preferedLocationType.appLink }] as LocationObject[];
    }
  }

  const eventTypeObject = Object.assign({}, eventType, {
    metadata: EventTypeMetaDataSchema.parse(eventType.metadata || {}),
    recurringEvent: parseRecurringEvent(eventType.recurringEvent),
    locations: privacyFilteredLocations(locations),
    users: users.map((user) => {
      return {
        name: user.name,
        username: user.username,
        hideBranding: user.hideBranding,
        timeZone: user.timeZone,
      };
    }),
  });

  const dynamicNames = users.map((user) => {
    return user.name || "";
  });

  const profile = {
    name: getGroupName(dynamicNames),
    image: null,
    slug: "" + length,
    theme: null as string | null,
    weekStart: "Sunday",
    brandColor: "",
    darkBrandColor: "",
    allowDynamicBooking: !users.some((user) => {
      return !user.allowDynamicBooking;
    }),
  };

  return {
    props: {
      eventType: eventTypeObject,
      profile,
      isDynamic: true,
      away: false,
      trpcState: ssg.dehydrate(),
      isBrandingHidden: false, // I think we should always show branding for dynamic groups - saves us checking every single user
    },
    revalidate: 10, // seconds
  };
}

const paramsSchema = z.object({ type: z.string(), user: z.string() });

export const getStaticProps = async (context: GetStaticPropsContext) => {
  const { user: userParam } = paramsSchema.parse(context.params);
  // dynamic groups are not generated at build time, but otherwise are probably cached until infinity.
  const isDynamicGroup = userParam.includes("+");
  if (isDynamicGroup) {
    return await getDynamicGroupPageProps(context);
  } else {
    return await getUserPageProps(context);
  }
};

export const getStaticPaths: GetStaticPaths = async () => {
  return { paths: [], fallback: "blocking" };
};
