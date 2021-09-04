import { GetServerSidePropsContext } from "next";
import prisma from "../../lib/prisma";

export default function Type() {
  // Just redirect to the schedule page to reschedule it.
  return null;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const booking = await prisma.booking.findFirst({
    where: {
      uid: context.query.uid as string,
    },
    select: {
      id: true,
      eventType: {
        select: {
          organizers: {
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
    } as const;
  }

  const eventPage =
    (booking.eventType.team
      ? "team/" + booking.eventType.team.slug
      : booking.eventType.organizers[0].username) +
    "/" +
    booking.eventType.slug;

  return {
    redirect: {
      destination: "/" + eventPage + "?rescheduleUid=" + context.query.uid,
      permanent: false,
    },
  };
}
