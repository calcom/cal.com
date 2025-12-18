// page can be a server component
import type { GetServerSidePropsContext } from "next";
import { URLSearchParams } from "url";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { buildEventUrlFromBooking } from "@calcom/features/bookings/lib/buildEventUrlFromBooking";
import { determineReschedulePreventionRedirect } from "@calcom/features/bookings/lib/reschedule/determineReschedulePreventionRedirect";
import { getDefaultEvent } from "@calcom/features/eventtypes/lib/defaultEvents";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { maybeGetBookingUidFromSeat } from "@calcom/lib/server/maybeGetBookingUidFromSeat";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";

const querySchema = z.object({
  uid: z.string(),
  seatReferenceUid: z.string().optional(),
  rescheduledBy: z.string().optional(),
  allowRescheduleForCancelledBooking: z
    .string()
    .transform((value) => value === "true")
    .optional(),
});

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession({ req: context.req });

  const {
    uid: bookingUid,
    seatReferenceUid,
    rescheduledBy,
    /**
     * This is for the case of request-reschedule where the booking is cancelled
     */
    allowRescheduleForCancelledBooking,
  } = querySchema.parse(context.query);

  const coepFlag = context.query["flag.coep"];
  const {
    uid,
    seatReferenceUid: maybeSeatReferenceUid,
    bookingSeat,
  } = await maybeGetBookingUidFromSeat(prisma, seatReferenceUid ? seatReferenceUid : bookingUid);

  const booking = await prisma.booking.findUnique({
    where: {
      uid,
    },
    select: {
      ...bookingMinimalSelect,
      userId: true,
      responses: true,
      eventType: {
        select: {
          users: {
            select: {
              username: true,
            },
          },
          slug: true,
          allowReschedulingPastBookings: true,
          disableRescheduling: true,
          allowReschedulingCancelledBookings: true,
          minimumRescheduleNotice: true,
          team: {
            select: {
              id: true,
              parentId: true,
              slug: true,
            },
          },
          seatsPerTimeSlot: true,
          userId: true,
          owner: {
            select: {
              id: true,
            },
          },
          hosts: {
            select: {
              user: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      },
      dynamicEventSlugRef: true,
      dynamicGroupSlugRef: true,
      user: true,
      status: true,
    },
  });
  const dynamicEventSlugRef = booking?.dynamicEventSlugRef || "";

  if (!booking) {
    return {
      notFound: true,
    } as const;
  }
  const eventType = booking.eventType ? booking.eventType : getDefaultEvent(dynamicEventSlugRef);

  const userRepo = new UserRepository(prisma);
  const enrichedBookingUser = booking.user
    ? await userRepo.enrichUserWithItsProfile({ user: booking.user })
    : null;

  const eventUrl = await buildEventUrlFromBooking({
    eventType,
    dynamicGroupSlugRef: booking.dynamicGroupSlugRef ?? null,
    profileEnrichedBookingUser: enrichedBookingUser,
  });

  if (!booking?.eventType && !booking?.dynamicEventSlugRef) {
    // TODO: Show something in UI to let user know that this booking is not rescheduleable
    return {
      notFound: true,
    } as const;
  }

  // Check if reschedule should be prevented based on booking status and event type settings
  const reschedulePreventionRedirectUrl = determineReschedulePreventionRedirect({
    booking: {
      uid,
      status: booking.status,
      startTime: booking.startTime,
      endTime: booking.endTime,
      responses: booking.responses,
      userId: booking.userId,
      eventType: {
        disableRescheduling: !!eventType?.disableRescheduling,
        allowReschedulingPastBookings: eventType.allowReschedulingPastBookings,
        allowBookingFromCancelledBookingReschedule: !!eventType.allowReschedulingCancelledBookings,
        minimumRescheduleNotice: eventType.minimumRescheduleNotice,
        teamId: eventType.team?.id ?? null,
      },
    },
    eventUrl,
    forceRescheduleForCancelledBooking: allowRescheduleForCancelledBooking,
    currentUserId: session?.user?.id ?? null,
    bookingSeat,
  });

  if (reschedulePreventionRedirectUrl) {
    return {
      redirect: {
        destination: reschedulePreventionRedirectUrl,
        permanent: false,
      },
    };
  }

  // if booking event type is for a seated event and no seat reference uid is provided, throw not found
  if (booking?.eventType?.seatsPerTimeSlot && !maybeSeatReferenceUid) {
    const userId = session?.user?.id;

    if (!userId && !seatReferenceUid) {
      return {
        redirect: {
          destination: `/auth/login?callbackUrl=/reschedule/${bookingUid}`,
          permanent: false,
        },
      };
    }
    const userIsHost = booking?.eventType.hosts.find((host) => {
      if (host.user.id === userId) return true;
    });

    const userIsOwnerOfEventType = booking?.eventType.owner?.id === userId;

    if (!userIsHost && !userIsOwnerOfEventType) {
      return {
        notFound: true,
      } as {
        notFound: true;
      };
    }
  }

  const destinationUrlSearchParams = new URLSearchParams();

  destinationUrlSearchParams.set("rescheduleUid", seatReferenceUid || bookingUid);

  if (allowRescheduleForCancelledBooking) {
    destinationUrlSearchParams.set("allowRescheduleForCancelledBooking", "true");
  }

  // TODO: I think we should just forward all the query params here including coep flag
  if (coepFlag) {
    destinationUrlSearchParams.set("flag.coep", coepFlag as string);
  }

  const currentUserEmail = rescheduledBy ?? session?.user?.email;

  if (currentUserEmail) {
    destinationUrlSearchParams.set("rescheduledBy", currentUserEmail);
  }

  return {
    redirect: {
      destination: `${eventUrl}?${destinationUrlSearchParams.toString()}${
        eventType.seatsPerTimeSlot ? "&bookingUid=null" : ""
      }`,
      permanent: false,
    },
  };
}
