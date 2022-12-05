import { GetServerSidePropsContext } from "next";

import { getDefaultEvent } from "@calcom/lib/defaultEvents";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";

import { asStringOrUndefined } from "@lib/asStringOrNull";

export default function Type() {
  // Just redirect to the schedule page to reschedule it.
  return null;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const uid = asStringOrUndefined(context.query.uid);

  const booking = await prisma.booking.findUnique({
    where: {
      uid,
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

  const queryParams = context.query;
  delete queryParams.uid;
  queryParams.rescheduleUid = uid;
  const query = new URLSearchParams(queryParams as Record<string, string>);

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
      destination: "/" + eventPage + "?" + query.toString(),
      permanent: false,
    },
  };
}
