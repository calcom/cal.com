import { createRouterCaller } from "app/_trpc/context";
import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { orgDomainConfig } from "@calcom/ee/organizations/lib/orgDomains";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getBookingDetailsForViewer } from "@calcom/features/bookings/lib/getBookingDetailsForViewer";
import { shouldHideBrandingForEvent } from "@calcom/features/profile/lib/hideBranding";
import prisma from "@calcom/prisma";
import { meRouter } from "@calcom/trpc/server/routers/viewer/me/_router";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

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

  const session = await getServerSession({ req: context.req });
  let tz: string | null = null;
  let userTimeFormat: number | null = null;
  if (session) {
    const caller = await createRouterCaller(meRouter);
    const user = await caller.get();
    tz = user.timeZone;
    userTimeFormat = user.timeFormat;
  }

  const parsedQuery = querySchema.safeParse(context.query);

  if (!parsedQuery.success) return { notFound: true } as const;
  const { uid, seatReferenceUid, eventTypeSlug } = parsedQuery.data;

  const bookingDetails = await getBookingDetailsForViewer(
    {
      prisma,
      uid,
      seatReferenceUid,
      eventTypeSlug,
      userId: session?.user?.id ?? null,
    },
    {
      getEventTypesFromDB,
      handleSeatsEventTypeOnBooking,
      getRecurringBookings,
    }
  );

  if (!bookingDetails) {
    return { notFound: true } as const;
  }

  const {
    profile,
    eventType,
    recurringBookings,
    dynamicEventName,
    bookingInfo,
    previousBooking,
    paymentStatus,
    requiresLoginToUpdate,
    rescheduledToUid,
    isLoggedInUserHost,
    canViewHiddenData,
    internalNotePresets,
    isPlatformBooking,
  } = bookingDetails;

  // @NOTE: had to do this because Server side cant return [Object objects]
  // probably fixable with json.stringify -> json.parse
  const bookingInfoForPage = {
    ...bookingInfo,
    startTime: (bookingInfo?.startTime as Date)?.toISOString() as unknown as Date,
    endTime: (bookingInfo?.endTime as Date)?.toISOString() as unknown as Date,
  };

  const { currentOrgDomain } = orgDomainConfig(context.req);

  return {
    props: {
      orgSlug: currentOrgDomain,
      themeBasis: eventType.team ? eventType.team.slug : eventType.users[0]?.username,
      hideBranding: isPlatformBooking
        ? true
        : await shouldHideBrandingForEvent({
            eventTypeId: eventType.id,
            team: eventType?.parent?.team ?? eventType?.team,
            owner: eventType.users[0] ?? null,
            organizationId: session?.user?.profile?.organizationId ?? session?.user?.org?.id ?? null,
          }),
      profile,
      eventType,
      recurringBookings,
      dynamicEventName,
      bookingInfo: bookingInfoForPage,
      previousBooking,
      paymentStatus,
      ...(tz && { tz }),
      userTimeFormat,
      requiresLoginToUpdate,
      rescheduledToUid,
      isLoggedInUserHost,
      canViewHiddenData,
      internalNotePresets,
    },
  };
}
