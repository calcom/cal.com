import { GetServerSidePropsContext } from "next";

import { getDefaultEvent } from "@calcom/lib/defaultEvents";

import { asStringOrUndefined } from "@lib/asStringOrNull";
import prisma from "@lib/prisma";

export default function Type() {
  // Just redirect to the schedule page to reschedule it.
  return null;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const booking = await prisma.booking.findUnique({
    where: {
      uid: asStringOrUndefined(context.query.uid),
    },
    select: {
      id: true,
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
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      attendees: true,
    },
  });
  const dynamicEventSlugRef = booking?.dynamicEventSlugRef || "";
  if (!booking?.eventType && !booking?.dynamicEventSlugRef) throw Error("This booking doesn't exists");

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
      destination: "/" + eventPage + "?rescheduleUid=" + context.query.uid,
      permanent: false,
    },
  };
}
