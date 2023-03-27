import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { Booker } from "@calcom/atoms";
import getBooking from "@calcom/features/bookings/lib/get-booking";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { getDefaultEvent } from "@calcom/lib/defaultEvents";
import { getUsernameList } from "@calcom/lib/defaultEvents";
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

async function getDynamicGroupPageProps(context: GetServerSidePropsContext) {
  const { user, type: slug } = paramsSchema.parse(context.params);
  const { rescheduleUid } = context.query;

  const { ssgInit } = await import("@server/lib/ssg");
  const ssg = await ssgInit(context);
  const usernameList = getUsernameList(user);

  const users = await prisma.user.findMany({
    where: {
      username: {
        in: usernameList,
      },
    },
    select: {
      allowDynamicBooking: true,
    },
  });

  if (!users.length) {
    return {
      notFound: true,
    };
  }

  let booking: GetBookingType | null = null;
  if (rescheduleUid) {
    booking = await getBookingDetails(`${rescheduleUid}`, slug);
  }

  return {
    props: {
      booking,
      user,
      slug,
      away: false,
      trpcState: ssg.dehydrate(),
    },
  };
}

async function getUserPageProps(context: GetServerSidePropsContext) {
  const { user: username, type: slug } = paramsSchema.parse(context.params);
  const { rescheduleUid } = context.query;
  const { ssgInit } = await import("@server/lib/ssg");
  const ssg = await ssgInit(context);
  const user = await prisma.user.findUnique({
    where: {
      username,
    },
    select: {
      away: true,
    },
  });

  if (!user) {
    return {
      notFound: true,
    };
  }

  let booking: GetBookingType | null = null;
  if (rescheduleUid) {
    booking = await getBookingDetails(`${rescheduleUid}`, slug);
  }

  return {
    props: {
      booking,
      away: user?.away,
      user: username,
      slug,
      trpcState: ssg.dehydrate(),
    },
  };
}

const paramsSchema = z.object({ type: z.string(), user: z.string() });

// Booker page fetches a tiny bit of data server side, to determine early
// whether the page should show an away state or dynamic booking not allowed.
export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { user } = paramsSchema.parse(context.params);
  const isDynamicGroup = user.includes("+");

  return isDynamicGroup ? await getDynamicGroupPageProps(context) : await getUserPageProps(context);
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
