import { GetServerSidePropsContext } from "next";
import { JSONObject } from "superjson/dist/types";

import { getLocationLabels } from "@calcom/app-store/utils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RecurringEvent } from "@calcom/types/Calendar";

import { asStringOrNull, asStringOrThrow } from "@lib/asStringOrNull";
import getBooking, { GetBookingType } from "@lib/getBooking";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import BookingPage from "@components/booking/pages/BookingPage";

export type TeamBookingPageProps = inferSSRProps<typeof getServerSideProps>;

export default function TeamBookingPage(props: TeamBookingPageProps) {
  const { t } = useLocale();
  const locationLabels = getLocationLabels(t);

  return <BookingPage {...props} locationLabels={locationLabels} />;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const eventTypeId = parseInt(asStringOrThrow(context.query.type));
  const recurringEventCountQuery = asStringOrNull(context.query.count);
  if (typeof eventTypeId !== "number" || eventTypeId % 1 !== 0) {
    return {
      notFound: true,
    } as const;
  }

  const eventTypeRaw = await prisma.eventType.findUnique({
    where: {
      id: eventTypeId,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      length: true,
      locations: true,
      customInputs: true,
      periodType: true,
      periodDays: true,
      periodStartDate: true,
      periodEndDate: true,
      periodCountCalendarDays: true,
      recurringEvent: true,
      disableGuests: true,
      price: true,
      currency: true,
      metadata: true,
      seatsPerTimeSlot: true,
      team: {
        select: {
          slug: true,
          name: true,
          logo: true,
        },
      },
      users: {
        select: {
          id: true,
          username: true,
          avatar: true,
          name: true,
        },
      },
    },
  });

  if (!eventTypeRaw) return { notFound: true };

  const eventType = {
    ...eventTypeRaw,
    recurringEvent: (eventTypeRaw.recurringEvent || {}) as RecurringEvent,
  };

  const eventTypeObject = [eventType].map((e) => {
    return {
      ...e,
      metadata: (eventType.metadata || {}) as JSONObject,
      periodStartDate: e.periodStartDate?.toString() ?? null,
      periodEndDate: e.periodEndDate?.toString() ?? null,
    };
  })[0];

  let booking: GetBookingType | null = null;
  if (context.query.rescheduleUid) {
    booking = await getBooking(prisma, context.query.rescheduleUid as string);
  }

  // Checking if number of recurring event ocurrances is valid against event type configuration
  const recurringEventCount =
    (eventType.recurringEvent?.count &&
      recurringEventCountQuery &&
      (parseInt(recurringEventCountQuery) <= eventType.recurringEvent.count
        ? recurringEventCountQuery
        : eventType.recurringEvent.count)) ||
    null;

  return {
    props: {
      profile: {
        ...eventTypeObject.team,
        // FIXME: This slug is used as username on success page which is wrong. This is correctly set as username for user booking.
        slug: "team/" + eventTypeObject.slug,
        image: eventTypeObject.team?.logo || null,
        theme: null /* Teams don't have a theme, and `BookingPage` uses it */,
        brandColor: null /* Teams don't have a brandColor, and `BookingPage` uses it */,
        darkBrandColor: null /* Teams don't have a darkBrandColor, and `BookingPage` uses it */,
        eventName: null,
      },
      eventType: eventTypeObject,
      recurringEventCount,
      booking,
      isDynamicGroupBooking: false,
      hasHashedBookingLink: false,
      hashedLink: null,
    },
  };
}
