import { GetServerSidePropsContext } from "next";
import prisma from "@lib/prisma";
import { asStringOrNull } from "@lib/asStringOrNull";

export default function Type() {
  // Just redirect to the schedule page to reschedule it.
  return null;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const booking = await prisma.booking.findUnique({
    where: {
      uid: asStringOrNull(context.query.uid),
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

  if (!booking.eventType) {
    return {
      notFound: true,
    };
  }

  const eventType = booking.eventType;

  const eventPage =
    (eventType.team ? "team/" + eventType.team.slug : booking.user.username) + "/" + booking.eventType.slug;

  return {
    redirect: {
      destination: "/" + eventPage + "?rescheduleUid=" + context.query.uid,
      permanent: false,
    },
  };
}
