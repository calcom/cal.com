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
      user: { select: { username: true } },
      eventType: { select: { slug: true } },
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      attendees: true,
    },
  });
  if (!booking?.user || !booking.eventType) {
    return {
      notFound: true,
    } as const;
  }

  return {
    redirect: {
      destination:
        "/" + booking.user.username + "/" + booking.eventType.slug + "?rescheduleUid=" + context.query.uid,
      permanent: false,
    },
  };
}
