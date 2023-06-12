import type { GetStaticPaths, GetStaticPropsContext } from "next";
import { z } from "zod";

import type { LocationObject } from "@calcom/app-store/locations";
import { IS_TEAM_BILLING_ENABLED, WEBAPP_URL } from "@calcom/lib/constants";
import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import type { User } from "@calcom/prisma/client";

import { isBrandingHidden } from "@lib/isBrandingHidden";
import type { inferSSRProps } from "@lib/types/inferSSRProps";
import type { EmbedProps } from "@lib/withEmbedSsr";

import PageWrapper from "@components/PageWrapper";
import AvailabilityPage from "@components/booking/pages/AvailabilityPage";

export type AvailabilityPageProps = inferSSRProps<typeof getStaticProps> & EmbedProps;

export default function Type(props: AvailabilityPageProps) {
  const { t } = useLocale();

  return props.away ? (
    <div className="dark:bg-inverted h-screen">
      <main className="mx-auto max-w-3xl px-4 py-24">
        <div className="space-y-6" data-testid="event-types">
          <div className="overflow-hidden rounded-sm border dark:border-gray-900">
            <div className="text-muted dark:text-inverted p-8 text-center">
              <h2 className="font-cal dark:text-inverted text-emphasis600 mb-2 text-3xl">
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
            <div className="text-muted dark:text-inverted p-8 text-center">
              <h2 className="font-cal dark:text-inverted text-emphasis600 mb-2 text-3xl">
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

Type.isBookingPage = true;
Type.PageWrapper = PageWrapper;

const paramsSchema = z.object({ type: z.string(), user: z.string() });
async function getUserPageProps(context: GetStaticPropsContext) {
  // load server side dependencies
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const { privacyFilteredLocations } = await import("@calcom/app-store/locations");
  const { parseRecurringEvent } = await import("@calcom/lib/isRecurringEvent");
  const { EventTypeMetaDataSchema, teamMetadataSchema } = await import("@calcom/prisma/zod-utils");
  const { ssgInit } = await import("@server/lib/ssg");

  const { type: slug, user: username } = paramsSchema.parse(context.params);
  const ssg = await ssgInit(context);

  const user = await prisma.user.findUnique({
    where: {
      /** TODO: We should standarize this */
      username: username.toLowerCase().replace(/( |%20)/g, "+"),
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
      metadata: true,
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
  if (!user || !user.eventTypes.length) return { notFound: true };

  const [eventType]: ((typeof user.eventTypes)[number] & {
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
    descriptionAsSafeHTML: markdownToSafeHTML(eventType.description),
  });
  // Check if the user you are logging into has any active teams or premium user name
  const hasActiveTeam =
    user.teams.filter((m) => {
      if (!IS_TEAM_BILLING_ENABLED) return true;
      const metadata = teamMetadataSchema.safeParse(m.team.metadata);
      if (metadata.success && metadata.data?.subscriptionId) return true;
      return false;
    }).length > 0;

  const hasPremiumUserName = hasKeyInMetadata(user, "isPremium") ? !!user.metadata.isPremium : false;

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
      // Dynamic group has no theme preference right now. It uses system theme.
      themeBasis: user.username,
      away: user?.away,
      isDynamic: false,
      trpcState: ssg.dehydrate(),
      isBrandingHidden: isBrandingHidden(user.hideBranding, hasActiveTeam || hasPremiumUserName),
    },
    revalidate: 10, // seconds
  };
}

async function getDynamicGroupPageProps(context: GetStaticPropsContext) {
  // load server side dependencies
  const { getDefaultEvent, getGroupName, getUsernameList } = await import("@calcom/lib/defaultEvents");
  const { privacyFilteredLocations } = await import("@calcom/app-store/locations");
  const { parseRecurringEvent } = await import("@calcom/lib/isRecurringEvent");
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const { EventTypeMetaDataSchema, userMetadata: userMetadataSchema } = await import(
    "@calcom/prisma/zod-utils"
  );
  const { ssgInit } = await import("@server/lib/ssg");
  const { getAppFromSlug } = await import("@calcom/app-store/utils");

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
      // Dynamic group has no theme preference right now. It uses system theme.
      themeBasis: null,
      isDynamic: true,
      away: false,
      trpcState: ssg.dehydrate(),
      isBrandingHidden: false, // I think we should always show branding for dynamic groups - saves us checking every single user
    },
    revalidate: 10, // seconds
  };
}

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
