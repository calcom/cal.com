import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { getDefaultEvent } from "@calcom/lib/defaultEvents";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";

export default function Type() {
  // Just redirect to the schedule page to reschedule it.
  return null;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  let bookingUid = z.string().parse(context.query.uid);

  // Booking uid while rescheduling can be a reference to bookingSeat Table
  if (bookingUid) {
    // Look bookingUid in bookingSeat
    const bookingSeat = await prisma.bookingSeat.findUnique({
      where: {
        referenceUId: bookingUid,
      },
      select: {
        booking: {
          select: {
            id: true,
            uid: true,
          },
        },
      },
    });
    if (bookingSeat) {
      bookingUid = bookingSeat.booking.uid;
    }
  }

  const booking = await prisma.booking.findUnique({
    where: {
      uid: bookingUid,
    },
    select: {
      ...bookingMinimalSelect,
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
    } as {
      notFound: true;
    };
  }

  if (!booking?.eventType && !booking?.dynamicEventSlugRef) {
    // TODO: Show something in UI to let user know that this booking is not rescheduleable.
    return {
      notFound: true,
    } as {
      notFound: true;
    };
  }

  const eventType = booking.eventType ? booking.eventType : getDefaultEvent(dynamicEventSlugRef);

  const eventPage =
    (eventType.team
      ? "team/" + eventType.team.slug
      : dynamicEventSlugRef
      ? booking.dynamicGroupSlugRef
      : booking.user?.username || "rick") /* This shouldn't happen */ +
    "/" +
    eventType?.slug;
  return {
    redirect: {
      destination: "/" + eventPage + "?rescheduleUid=" + bookingUid,
      permanent: false,
    },
  };
}
