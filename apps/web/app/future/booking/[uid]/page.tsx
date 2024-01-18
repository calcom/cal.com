import OldPage from "@pages/booking/[uid]";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import type { GetServerSidePropsContext } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getBookingWithResponses } from "@calcom/features/bookings/lib/get-booking";
import { parseRecurringEvent } from "@calcom/lib";
import { getDefaultEvent } from "@calcom/lib/defaultEvents";
import { maybeGetBookingUidFromSeat } from "@calcom/lib/server/maybeGetBookingUidFromSeat";
import prisma from "@calcom/prisma";
import { customInputSchema, EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { getRecurringBookings, handleSeatsEventTypeOnBooking, getEventTypesFromDB } from "@lib/booking";

import { ssrInit } from "@server/lib/ssr";

const stringToBoolean = z
  .string()
  .optional()
  .transform((val) => val === "true");

const querySchema = z.object({
  uid: z.string(),
  email: z.string().optional(),
  eventTypeSlug: z.string().optional(),
  cancel: stringToBoolean,
  allRemainingBookings: stringToBoolean,
  changes: stringToBoolean,
  reschedule: stringToBoolean,
  isSuccessBookingPage: stringToBoolean,
  formerTime: z.string().optional(),
  seatReferenceUid: z.string().optional(),
});

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "",
    () => ""
  );

const getData = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);
  const session = await getServerSession(context);
  let tz: string | null = null;
  let userTimeFormat: number | null = null;
  let requiresLoginToUpdate = false;
  if (session) {
    const user = await ssr.viewer.me.fetch();
    tz = user.timeZone;
    userTimeFormat = user.timeFormat;
  }

  const parsedQuery = querySchema.safeParse(context.query);

  if (!parsedQuery.success) {
    notFound();
  }

  const { uid, eventTypeSlug, seatReferenceUid } = parsedQuery.data;

  const { uid: maybeUid } = await maybeGetBookingUidFromSeat(prisma, uid);
  const bookingInfoRaw = await prisma.booking.findFirst({
    where: {
      uid: maybeUid,
    },
    select: {
      title: true,
      id: true,
      uid: true,
      description: true,
      customInputs: true,
      smsReminderNumber: true,
      recurringEventId: true,
      startTime: true,
      endTime: true,
      location: true,
      status: true,
      metadata: true,
      cancellationReason: true,
      responses: true,
      rejectionReason: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          timeZone: true,
        },
      },
      attendees: {
        select: {
          name: true,
          email: true,
          timeZone: true,
        },
      },
      eventTypeId: true,
      eventType: {
        select: {
          eventName: true,
          slug: true,
          timeZone: true,
        },
      },
      seatsReferences: {
        select: {
          referenceUid: true,
        },
      },
    },
  });

  if (!bookingInfoRaw) {
    notFound();
  }

  const eventTypeRaw = !bookingInfoRaw.eventTypeId
    ? getDefaultEvent(eventTypeSlug || "")
    : await getEventTypesFromDB(bookingInfoRaw.eventTypeId);
  if (!eventTypeRaw) {
    notFound();
  }

  if (eventTypeRaw.seatsPerTimeSlot && !seatReferenceUid && !session) {
    requiresLoginToUpdate = true;
  }

  const bookingInfo = getBookingWithResponses(bookingInfoRaw);
  // @NOTE: had to do this because Server side cant return [Object objects]
  // probably fixable with json.stringify -> json.parse
  bookingInfo["startTime"] = (bookingInfo?.startTime as Date)?.toISOString() as unknown as Date;
  bookingInfo["endTime"] = (bookingInfo?.endTime as Date)?.toISOString() as unknown as Date;

  eventTypeRaw.users = !!eventTypeRaw.hosts?.length
    ? eventTypeRaw.hosts.map((host) => host.user)
    : eventTypeRaw.users;

  if (!eventTypeRaw.users.length) {
    if (!eventTypeRaw.owner) {
      notFound();
    }

    eventTypeRaw.users.push({
      ...eventTypeRaw.owner,
    });
  }

  const eventType = {
    ...eventTypeRaw,
    periodStartDate: eventTypeRaw.periodStartDate?.toString() ?? null,
    periodEndDate: eventTypeRaw.periodEndDate?.toString() ?? null,
    metadata: EventTypeMetaDataSchema.parse(eventTypeRaw.metadata),
    recurringEvent: parseRecurringEvent(eventTypeRaw.recurringEvent),
    customInputs: customInputSchema.array().parse(eventTypeRaw.customInputs),
  };

  const profile = {
    name: eventType.team?.name || eventType.users[0]?.name || null,
    email: eventType.team ? null : eventType.users[0].email || null,
    theme: (!eventType.team?.name && eventType.users[0]?.theme) || null,
    brandColor: eventType.team ? null : eventType.users[0].brandColor || null,
    darkBrandColor: eventType.team ? null : eventType.users[0].darkBrandColor || null,
    slug: eventType.team?.slug || eventType.users[0]?.username || null,
  };

  if (bookingInfo !== null && eventType.seatsPerTimeSlot) {
    await handleSeatsEventTypeOnBooking(eventType, bookingInfo, seatReferenceUid, session?.user.id);
  }

  const payment = await prisma.payment.findFirst({
    where: {
      bookingId: bookingInfo.id,
    },
    select: {
      success: true,
      refunded: true,
      currency: true,
      amount: true,
      paymentOption: true,
    },
  });

  return {
    themeBasis: eventType.team ? eventType.team.slug : eventType.users[0]?.username,
    hideBranding: eventType.team ? eventType.team.hideBranding : eventType.users[0].hideBranding,
    profile,
    eventType,
    recurringBookings: await getRecurringBookings(bookingInfo.recurringEventId),
    dehydratedState: ssr.dehydrate(),
    dynamicEventName: bookingInfo?.eventType?.eventName || "",
    bookingInfo,
    paymentStatus: payment,
    ...(tz && { tz }),
    userTimeFormat,
    requiresLoginToUpdate,
  };
};

// @ts-expect-error Argument of type '{ req: { headers: ReadonlyHeaders; cookies: ReadonlyRequestCookies; }; }' is not assignable to parameter of type 'GetServerSidePropsContext'.
export default WithLayout({ getLayout: null, getData, Page: OldPage });
