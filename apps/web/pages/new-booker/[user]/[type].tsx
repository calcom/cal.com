import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { Booker } from "@calcom/atoms";
import { getBookingByUidOrRescheduleUid } from "@calcom/features/bookings/lib/get-booking";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import prisma from "@calcom/prisma";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import PageWrapper from "@components/PageWrapper";

type PageProps = inferSSRProps<typeof getServerSideProps>;

export default function Type({ slug, user, booking, away }: PageProps) {
  return (
    <main className="flex justify-center">
      <Booker username={user} eventSlug={slug} rescheduleBooking={booking} isAway={away} />
    </main>
  );
}

Type.PageWrapper = PageWrapper;

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
    booking = await getBookingByUidOrRescheduleUid(`${rescheduleUid}`);
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
    booking = await getBookingByUidOrRescheduleUid(`${rescheduleUid}`);
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
