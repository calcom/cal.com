import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { Booker } from "@calcom/atoms";
import getBooking from "@calcom/features/bookings/lib/get-booking";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { getDefaultEvent } from "@calcom/lib/defaultEvents";
import prisma, { bookEventTypeSelect } from "@calcom/prisma";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

type PageProps = inferSSRProps<typeof getServerSideProps>;

export default function Type({ slug, user, booking, away }: PageProps) {
  return (
    <main className="flex justify-center">
      <Booker username={user} eventSlug={slug} rescheduleBooking={booking} isAway={away} />
    </main>
  );
}

Type.isThemeSupported = true;

const paramsSchema = z.object({ type: z.string(), slug: z.string() });

// Booker page fetches a tiny bit of data server side:
// 1. Check if team exists, to show 404
// 2. If rescheduling, get the booking details
export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { slug: teamSlug, type: meetingSlug } = paramsSchema.parse(context.params);
  const { rescheduleUid } = context.query;
  const { ssgInit } = await import("@server/lib/ssg");
  const ssg = await ssgInit(context);

  const team = await prisma.team.findFirst({
    where: {
      slug: teamSlug,
    },
    select: {
      id: true,
    },
  });

  if (!team) {
    return {
      notFound: true,
    };
  }

  let booking: GetBookingType | null = null;
  if (rescheduleUid) {
    booking = await getBookingDetails(`${rescheduleUid}`, meetingSlug);
  }

  return {
    props: {
      booking,
      away: false,
      user: teamSlug,
      slug: meetingSlug,
      trpcState: ssg.dehydrate(),
    },
  };
};

const getBookingDetails = async (uid: string, slug: string) => {
  const booking = await prisma.booking.findFirst({
    where: {
      uid,
    },
    select: {
      eventTypeId: true,
    },
  });

  const eventTypeRaw = !booking?.eventTypeId
    ? getDefaultEvent(slug || "")
    : await prisma.eventType.findUnique({
        where: {
          id: booking.eventTypeId,
        },
        select: {
          ...bookEventTypeSelect,
        },
      });

  if (!booking || !eventTypeRaw) return null;

  return await getBooking(prisma, uid, getBookingFieldsWithSystemFields(eventTypeRaw));
};
