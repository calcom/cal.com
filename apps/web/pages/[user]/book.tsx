import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import type { LocationObject } from "@calcom/app-store/locations";
import { privacyFilteredLocations } from "@calcom/app-store/locations";
import { getAppFromSlug } from "@calcom/app-store/utils";
import dayjs from "@calcom/dayjs";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { parseRecurringEvent } from "@calcom/lib";
import {
  getDefaultEvent,
  getDynamicEventName,
  getGroupName,
  getUsernameList,
} from "@calcom/lib/defaultEvents";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma, { bookEventTypeSelect } from "@calcom/prisma";
import {
  customInputSchema,
  EventTypeMetaDataSchema,
  userMetadata as userMetadataSchema,
} from "@calcom/prisma/zod-utils";

import type { GetBookingType } from "@lib/getBooking";
import getBooking from "@lib/getBooking";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

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

const querySchema = z.object({
  bookingUid: z.string().optional(),
  count: z.coerce.number().optional(),
  embed: z.string().optional(),
  rescheduleUid: z.string().optional(),
  slug: z.string().optional(),
  /** This is the event "type" ID */
  type: z.coerce.number().optional(),
  user: z.string(),
  seatReferenceUid: z.string().optional(),
  date: z.string().optional(),
  duration: z.coerce.number().optional(),
});

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const ssr = await ssrInit(context);
  const query = querySchema.parse(context.query);
  const usernameList = getUsernameList(query.user);
  const eventTypeSlug = query.slug;
  const recurringEventCountQuery = query.count;
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
      metadata: true,
    },
  });

  if (!users.length) return { notFound: true };
  const [user] = users;
  const isDynamicGroupBooking = users.length > 1 && !!eventTypeSlug;

  // Dynamic Group link doesn't need a type but it must have a slug
  if ((!isDynamicGroupBooking && !query.type) || (users.length > 1 && !eventTypeSlug)) {
    return { notFound: true };
  }

  const eventTypeRaw = isDynamicGroupBooking
    ? getDefaultEvent(eventTypeSlug)
    : await prisma.eventType.findUnique({
        where: {
          id: query.type,
        },
        select: {
          ...bookEventTypeSelect,
        },
      });

  if (!eventTypeRaw) return { notFound: true };
  const eventType = {
    ...eventTypeRaw,
    metadata: EventTypeMetaDataSchema.parse(eventTypeRaw.metadata || {}),
    bookingFields: getBookingFieldsWithSystemFields(eventTypeRaw),
    recurringEvent: parseRecurringEvent(eventTypeRaw.recurringEvent),
  };

  const getLocations = () => {
    let locations = eventTypeRaw.locations || [];
    if (!isDynamicGroupBooking) return locations;

    let sortedUsers: typeof users = [];
    // sort and be in the same order as usernameList so first user is the first user in the list
    if (users.length > 1) {
      sortedUsers = users.sort((a, b) => {
        const aIndex = (a.username && usernameList.indexOf(a.username)) || 0;
        const bIndex = (b.username && usernameList.indexOf(b.username)) || 0;
        return aIndex - bIndex;
      });
    }

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
    return locations;
  };

  const eventTypeObject = [eventType].map((e) => {
    let locations = getLocations();
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

  // If rescheduleUid and event has seats lets convert Uid to bookingUid
  let rescheduleUid = query.rescheduleUid;
  const rescheduleEventTypeHasSeats = query.rescheduleUid && eventTypeRaw.seatsPerTimeSlot;
  let attendeeEmail: string;
  let bookingUidWithSeats: string | null = null;

  if (rescheduleEventTypeHasSeats) {
    const bookingSeat = await prisma.bookingSeat.findFirst({
      where: {
        referenceUid: query.rescheduleUid,
      },
      select: {
        id: true,
        attendee: true,
        booking: {
          select: {
            uid: true,
          },
        },
      },
    });
    if (bookingSeat) {
      rescheduleUid = bookingSeat.booking.uid;
      attendeeEmail = bookingSeat.attendee.email;
    }
  } else if (eventTypeRaw.seatsPerTimeSlot && query.duration && query.date) {
    // If it's not reschedule but event Type has seats we should obtain
    // the bookingUid regardless and use it to get the booking
    const currentSeats = await prisma.booking.findFirst({
      where: {
        eventTypeId: eventTypeRaw.id,
        startTime: dayjs(query.date).toISOString(),
        endTime: dayjs(query.date).add(query.duration, "minutes").toISOString(),
      },
      select: {
        uid: true,
      },
    });
    if (currentSeats && currentSeats) {
      bookingUidWithSeats = currentSeats.uid;
    }
  }

  let booking: GetBookingType | null = null;
  if (rescheduleUid || query.bookingUid || bookingUidWithSeats) {
    booking = await getBooking(prisma, rescheduleUid || query.bookingUid || bookingUidWithSeats || "");
  }

  if (rescheduleEventTypeHasSeats && booking?.attendees && booking?.attendees.length > 0) {
    const currentAttendee = booking?.attendees.find((attendee) => {
      return attendee.email === attendeeEmail;
    });
    if (currentAttendee) {
      booking.attendees = [currentAttendee] || [];
    }
  }

  const dynamicNames = isDynamicGroupBooking ? users.map((user) => user.name || "") : [];

  const profile = isDynamicGroupBooking
    ? {
        name: getGroupName(dynamicNames),
        image: null,
        slug: eventTypeSlug,
        theme: null,
        brandColor: "",
        darkBrandColor: "",
        allowDynamicBooking: !users.some((user) => !user.allowDynamicBooking),
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
      (recurringEventCountQuery <= eventType.recurringEvent.count
        ? recurringEventCountQuery
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
      isEmbed: !!query.embed,
    },
  };
}
