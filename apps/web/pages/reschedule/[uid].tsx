import { GetServerSidePropsContext } from "next";

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
      user: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      attendees: true,
    },
  });

  if (!booking?.eventType) throw Error("This booking doesn't exists");

  const eventType = booking.eventType;

  const eventPage =
    (eventType.team
      ? "team/" + eventType.team.slug
      : booking.user?.username || "rick") /* This shouldn't happen */ +
    "/" +
    booking.eventType.slug;

  return {
    redirect: {
      destination: "/" + eventPage + "?rescheduleUid=" + context.query.uid,
      permanent: false,
    },
  };
}
