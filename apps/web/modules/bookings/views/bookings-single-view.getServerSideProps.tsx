import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { orgDomainConfig } from "@calcom/ee/organizations/lib/orgDomains";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import getBookingInfo from "@calcom/features/bookings/lib/getBookingInfo";
import { parseRecurringEvent } from "@calcom/lib";
import { getDefaultEvent } from "@calcom/lib/defaultEvents";
import { maybeGetBookingUidFromSeat } from "@calcom/lib/server/maybeGetBookingUidFromSeat";
import prisma from "@calcom/prisma";
import { customInputSchema, EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

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

export type PageProps = inferSSRProps<typeof getServerSideProps>;

export async function getServerSideProps(context: GetServerSidePropsContext) {
  // this is needed to prevent bundling of lib/booking to the client bundle
  // usually functions that are used in getServerSideProps are tree shaken from client bundle
  // but not in case when they are exported. So we have to dynamically load them, or to copy paste them to the /future/page.

  const { getRecurringBookings, handleSeatsEventTypeOnBooking, getEventTypesFromDB } = await import(
    "@lib/booking"
  );

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

  if (!parsedQuery.success) return { notFound: true } as const;
  const { eventTypeSlug } = parsedQuery.data;
  let { uid, seatReferenceUid } = parsedQuery.data;

  const maybeBookingUidFromSeat = await maybeGetBookingUidFromSeat(prisma, uid);
  if (maybeBookingUidFromSeat.uid) uid = maybeBookingUidFromSeat.uid;
  if (maybeBookingUidFromSeat.seatReferenceUid) seatReferenceUid = maybeBookingUidFromSeat.seatReferenceUid;

  const { bookingInfoRaw, bookingInfo } = await getBookingInfo(uid);

  if (!bookingInfoRaw) {
    return {
      notFound: true,
    } as const;
  }

  const eventTypeRaw = !bookingInfoRaw.eventTypeId
    ? getDefaultEvent(eventTypeSlug || "")
    : await getEventTypesFromDB(bookingInfoRaw.eventTypeId);
  if (!eventTypeRaw) {
    return {
      notFound: true,
    } as const;
  }

  if (eventTypeRaw.seatsPerTimeSlot && !seatReferenceUid && !session) {
    requiresLoginToUpdate = true;
  }

  // @NOTE: had to do this because Server side cant return [Object objects]
  // probably fixable with json.stringify -> json.parse
  bookingInfo["startTime"] = (bookingInfo?.startTime as Date)?.toISOString() as unknown as Date;
  bookingInfo["endTime"] = (bookingInfo?.endTime as Date)?.toISOString() as unknown as Date;

  eventTypeRaw.users = !!eventTypeRaw.hosts?.length
    ? eventTypeRaw.hosts.map((host) => host.user)
    : eventTypeRaw.users;

  if (!eventTypeRaw.users.length) {
    if (!eventTypeRaw.owner)
      return {
        notFound: true,
      } as const;
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
    await handleSeatsEventTypeOnBooking(
      eventType,
      bookingInfo,
      seatReferenceUid,
      session?.user.id === eventType.userId
    );
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

  const userId = session?.user?.id;
  const isLoggedInUserHost =
    userId &&
    (eventType.users.some((user) => user.id === userId) ||
      eventType.hosts.some(({ user }) => user.id === userId));

  if (!isLoggedInUserHost) {
    // Removing hidden fields from responses
    for (const key in bookingInfo.responses) {
      const field = eventTypeRaw.bookingFields.find((field) => field.name === key);
      if (field && !!field.hidden) {
        delete bookingInfo.responses[key];
      }
    }
  }

  const { currentOrgDomain } = orgDomainConfig(context.req);
  return {
    props: {
      orgSlug: currentOrgDomain,
      themeBasis: eventType.team ? eventType.team.slug : eventType.users[0]?.username,
      hideBranding: eventType.team ? eventType.team.hideBranding : eventType.users[0].hideBranding,
      profile,
      eventType,
      recurringBookings: await getRecurringBookings(bookingInfo.recurringEventId),
      trpcState: ssr.dehydrate(),
      dynamicEventName: bookingInfo?.eventType?.eventName || "",
      bookingInfo,
      paymentStatus: payment,
      ...(tz && { tz }),
      userTimeFormat,
      requiresLoginToUpdate,
    },
  };
}
