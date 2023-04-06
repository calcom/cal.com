import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import type { LocationObject } from "@calcom/app-store/locations";
import { privacyFilteredLocations } from "@calcom/app-store/locations";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { parseRecurringEvent } from "@calcom/lib";
import type { GetBookingType } from "@calcom/lib/getBooking";
import getBooking from "@calcom/lib/getBooking";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import prisma from "@calcom/prisma";
import { customInputSchema, eventTypeBookingFields, EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { asStringOrNull, asStringOrThrow } from "@lib/asStringOrNull";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

import BookingPage from "@components/booking/pages/BookingPage";

import { ssrInit } from "@server/lib/ssr";

export type TeamBookingPageProps = inferSSRProps<typeof getServerSideProps>;

export default function TeamBookingPage(props: TeamBookingPageProps) {
  return <BookingPage {...props} />;
}

const querySchema = z.object({
  rescheduleUid: z.string().optional(),
  bookingUid: z.string().optional(),
});

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const ssr = await ssrInit(context);
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
      requiresConfirmation: true,
      disableGuests: true,
      price: true,
      currency: true,
      metadata: true,
      seatsPerTimeSlot: true,
      schedulingType: true,
      bookingFields: true,
      workflows: {
        include: {
          workflow: {
            include: {
              steps: true,
            },
          },
        },
      },
      team: {
        select: {
          slug: true,
          name: true,
          logo: true,
          theme: true,
          brandColor: true,
          darkBrandColor: true,
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
    //TODO: Use zodSchema to verify it instead of using Type Assertion
    locations: privacyFilteredLocations((eventTypeRaw.locations || []) as LocationObject[]),
    recurringEvent: parseRecurringEvent(eventTypeRaw.recurringEvent),
    bookingFields: eventTypeBookingFields.parse(eventTypeRaw.bookingFields || []),
  };
  const eventTypeObject = [eventType].map((e) => {
    return {
      ...e,
      metadata: EventTypeMetaDataSchema.parse(e.metadata || {}),
      bookingFields: getBookingFieldsWithSystemFields(eventType),
      periodStartDate: e.periodStartDate?.toString() ?? null,
      periodEndDate: e.periodEndDate?.toString() ?? null,
      customInputs: customInputSchema.array().parse(e.customInputs || []),
      users: eventType.users.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        avatar: u.avatar,
        image: u.avatar,
        slug: u.username,
      })),
      descriptionAsSafeHTML: markdownToSafeHTML(eventType.description),
    };
  })[0];

  let booking: GetBookingType | null = null;
  const { rescheduleUid, bookingUid } = querySchema.parse(context.query);
  if (rescheduleUid || bookingUid) {
    booking = await getBooking(prisma, rescheduleUid || bookingUid || "");
  }

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
      trpcState: ssr.dehydrate(),
      profile: {
        ...eventTypeObject.team,
        // FIXME: This slug is used as username on success page which is wrong. This is correctly set as username for user booking.
        slug: "team/" + eventTypeObject.slug,
        image: eventTypeObject.team?.logo || null,
        eventName: null,
      },
      eventType: eventTypeObject,
      recurringEventCount,
      booking,
      currentSlotBooking: null,
      isDynamicGroupBooking: false,
      hasHashedBookingLink: false,
      hashedLink: null,
      isEmbed: typeof context.query.embed === "string",
    },
  };
}
