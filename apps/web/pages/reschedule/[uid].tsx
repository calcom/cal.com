import type { GetServerSidePropsContext } from "next";
import { URLSearchParams } from "url";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getDefaultEvent } from "@calcom/lib/defaultEvents";
import { maybeGetBookingUidFromSeat } from "@calcom/lib/server/maybeGetBookingUidFromSeat";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";

export default function Type() {
  // Just redirect to the schedule page to reschedule it.
  return null;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context);

  const { uid: bookingUid, seatReferenceUid } = z
    .object({ uid: z.string(), seatReferenceUid: z.string().optional() })
    .parse(context.query);

  const { uid, seatReferenceUid: maybeSeatReferenceUid } = await maybeGetBookingUidFromSeat(
    prisma,
    bookingUid
  );

  // A booking might have been rescheduled multiple times. We need to find the last booking
  let firstQuery = true;
  let allBookingsQueried = false;
  let queryUid = uid;
  let bookingAlreadyRescheduled = false;

  let bookingInRescheduleChain: {
    uid: string;
    fromReschedule: string | null;
    rescheduledTo: string | null;
  } = {
    uid,
    fromReschedule: null,
    rescheduledTo: null,
  };
  while (!allBookingsQueried) {
    if (firstQuery) {
      const bookingQuery = await prisma.booking.findMany({
        where: {
          OR: [
            {
              uid: queryUid,
            },
            {
              fromReschedule: queryUid,
            },
          ],
        },

        select: {
          uid: true,
          fromReschedule: true,
          rescheduledTo: true,
        },
      });

      bookingInRescheduleChain =
        bookingQuery.find((booking) => {
          if (booking.fromReschedule === uid) {
            bookingAlreadyRescheduled = true;
            return true;
          } else {
            return false;
          }
        }) || bookingQuery[0];

      // There is not the last booking in the rescheduleChain
      if (bookingInRescheduleChain.rescheduledTo) {
        queryUid = bookingInRescheduleChain.rescheduledTo;
        firstQuery = false;
      } else {
        allBookingsQueried = true;
      }
    } else {
      const bookingQuery = await prisma.booking.findFirst({
        where: {
          OR: [
            {
              uid: queryUid,
            },
            {
              fromReschedule: queryUid,
            },
          ],
        },
        select: {
          uid: true,
          fromReschedule: true,
          rescheduledTo: true,
        },
      });

      // If somewhere along the chain was broken. Return the last found booking
      if (!bookingQuery) {
        allBookingsQueried = true;
      }

      // See if this booking was the last in the chain
      if (bookingQuery?.rescheduledTo) {
        queryUid = bookingQuery.rescheduledTo;
      } else {
        allBookingsQueried = true;
      }
    }
  }

  const booking = await prisma.booking.findUnique({
    where: {
      uid: bookingInRescheduleChain?.uid,
    },
    select: {
      ...bookingMinimalSelect,
      uid: true,
      eventType: {
        select: {
          users: {
            select: {
              username: true,
            },
          },
          slug: true,
          team: {
            select: {
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
    },
  });

  const dynamicEventSlugRef = booking?.dynamicEventSlugRef || "";

  if (!booking) {
    return {
      notFound: true,
    } as const;
  }

  // If booking with uid was already rescheduled. Show the booking that was rescheduled

  if (bookingAlreadyRescheduled) {
    return {
      redirect: {
        destination: `/booking/${booking.uid}?alreadyRescheduled=true`,
        permanent: false,
      },
    };
  }

  if (!booking?.eventType && !booking?.dynamicEventSlugRef) {
    // TODO: Show something in UI to let user know that this booking is not rescheduleable
    return {
      notFound: true,
    } as {
      notFound: true;
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

  const eventType = booking.eventType ? booking.eventType : getDefaultEvent(dynamicEventSlugRef);

  const eventPage = `${
    eventType.team
      ? `team/${eventType.team.slug}`
      : dynamicEventSlugRef
      ? booking.dynamicGroupSlugRef
      : booking.user?.username || "rick" /* This shouldn't happen */
  }/${eventType?.slug}`;
  const destinationUrl = new URLSearchParams();

  destinationUrl.set("rescheduleUid", seatReferenceUid || bookingUid);

  return {
    redirect: {
      destination: `/${eventPage}?${destinationUrl.toString()}${
        eventType.seatsPerTimeSlot ? "&bookingUid=null" : ""
      }`,
      permanent: false,
    },
  };
}
