import { GetServerSidePropsContext } from "next";
import { JSONObject } from "superjson/dist/types";

import { LocationObject, privacyFilteredLocations } from "@calcom/app-store/locations";
import { parseRecurringEvent } from "@calcom/lib";
import {
  getDefaultEvent,
  getDynamicEventName,
  getGroupName,
  getUsernameList,
} from "@calcom/lib/defaultEvents";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { bookEventTypeSelect } from "@calcom/prisma";
import prisma from "@calcom/prisma";
import { customInputSchema, EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { asStringOrNull, asStringOrThrow } from "@lib/asStringOrNull";
import getBooking, { GetBookingType } from "@lib/getBooking";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import BookingPage from "@components/booking/pages/BookingPage";

import { ssrInit } from "@server/lib/ssr";

export type BookPageProps = inferSSRProps<typeof getServerSideProps>;

export default function Book(props: BookPageProps) {
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
  ) : props.isDynamicGroupBooking && !props.profile.allowDynamicBooking ? (
    <div className="h-screen dark:bg-gray-900">
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
    <BookingPage {...props} />
  );
}

Book.isThemeSupported = true;

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const ssr = await ssrInit(context);
  const usernameList = getUsernameList(asStringOrThrow(context.query.user as string));
  const eventTypeSlug = context.query.slug as string;
  const recurringEventCountQuery = asStringOrNull(context.query.count);
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
      theme: true,
      brandColor: true,
      darkBrandColor: true,
      allowDynamicBooking: true,
      away: true,
    },
  });

  if (!users.length) return { notFound: true };
  const [user] = users;
  const isDynamicGroupBooking = users.length > 1;

  // Dynamic Group link doesn't need a type but it must have a slug
  if ((!isDynamicGroupBooking && !context.query.type) || (isDynamicGroupBooking && !eventTypeSlug)) {
    return { notFound: true };
  }

  const eventTypeRaw =
    usernameList.length > 1
      ? getDefaultEvent(eventTypeSlug)
      : await prisma.eventType.findUnique({
          where: {
            id: parseInt(asStringOrThrow(context.query.type)),
          },
          select: {
            ...bookEventTypeSelect,
          },
        });

  if (!eventTypeRaw) return { notFound: true };

  const eventType = {
    ...eventTypeRaw,
    metadata: EventTypeMetaDataSchema.parse(eventTypeRaw.metadata || {}),
    recurringEvent: parseRecurringEvent(eventTypeRaw.recurringEvent),
  };

  const eventTypeObject = [eventType].map((e) => {
    let locations = eventTypeRaw.locations || [];
    locations = privacyFilteredLocations(locations as LocationObject[]);
    return {
      ...e,
      locations: locations,
      periodStartDate: e.periodStartDate?.toString() ?? null,
      periodEndDate: e.periodEndDate?.toString() ?? null,
      schedulingType: null,
      customInputs: customInputSchema.array().parse(e.customInputs || []),
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        avatar: u.avatar,
        image: u.avatar,
        slug: u.username,
        theme: u.theme,
      })),
    };
  })[0];

  let booking: GetBookingType | null = null;
  if (context.query.rescheduleUid || context.query.bookingUid) {
    booking = await getBooking(
      prisma,
      context.query.rescheduleUid
        ? (context.query.rescheduleUid as string)
        : (context.query.bookingUid as string)
    );
  }

  const dynamicNames = isDynamicGroupBooking
    ? users.map((user) => {
        return user.name || "";
      })
    : [];

  const profile = isDynamicGroupBooking
    ? {
        name: getGroupName(dynamicNames),
        image: null,
        slug: eventTypeSlug,
        theme: null,
        brandColor: "",
        darkBrandColor: "",
        allowDynamicBooking: !users.some((user) => {
          return !user.allowDynamicBooking;
        }),
        eventName: getDynamicEventName(dynamicNames, eventTypeSlug),
      }
    : {
        name: user.name || user.username,
        image: user.avatar,
        slug: user.username,
        theme: user.theme,
        brandColor: user.brandColor,
        darkBrandColor: user.darkBrandColor,
        eventName: null,
      };

  // Checking if number of recurring event ocurrances is valid against event type configuration
  const recurringEventCount =
    (eventType.recurringEvent?.count &&
      recurringEventCountQuery &&
      (parseInt(recurringEventCountQuery) <= eventType.recurringEvent.count
        ? parseInt(recurringEventCountQuery)
        : eventType.recurringEvent.count)) ||
    null;

  return {
    props: {
      away: user.away,
      profile,
      eventType: eventTypeObject,
      booking,
      recurringEventCount,
      trpcState: ssr.dehydrate(),
      isDynamicGroupBooking,
      hasHashedBookingLink: false,
      hashedLink: null,
      isEmbed: typeof context.query.embed === "string",
    },
  };
}
