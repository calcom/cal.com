import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { GetServerSidePropsContext } from "next";

import { asStringOrThrow } from "@lib/asStringOrNull";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import BookingPage from "@components/booking/pages/BookingPage";

import { ssrInit } from "@server/lib/ssr";

dayjs.extend(utc);
dayjs.extend(timezone);

export type BookPageProps = inferSSRProps<typeof getServerSideProps>;

export default function Book(props: BookPageProps) {
  return <BookingPage {...props} />;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const ssr = await ssrInit(context);

  const user = await prisma.user.findUnique({
    where: {
      username: asStringOrThrow(context.query.user),
    },
    select: {
      username: true,
      name: true,
      email: true,
      bio: true,
      avatar: true,
      theme: true,
      brandColor: true,
    },
  });

  if (!user) return { notFound: true };

  const eventType = await prisma.eventType.findUnique({
    where: {
      id: parseInt(asStringOrThrow(context.query.type)),
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      length: true,
      locations: true,
      customInputs: true,
      periodType: true,
      periodDays: true,
      periodStartDate: true,
      periodEndDate: true,
      periodCountCalendarDays: true,
      price: true,
      currency: true,
      disableGuests: true,
      users: {
        select: {
          username: true,
          name: true,
          email: true,
          bio: true,
          avatar: true,
          theme: true,
        },
      },
    },
  });

  if (!eventType) return { notFound: true };

  const eventTypeObject = [eventType].map((e) => {
    return {
      ...e,
      periodStartDate: e.periodStartDate?.toString() ?? null,
      periodEndDate: e.periodEndDate?.toString() ?? null,
    };
  })[0];

  let booking = null;

  if (context.query.rescheduleUid) {
    booking = await prisma.booking.findFirst({
      where: {
        uid: asStringOrThrow(context.query.rescheduleUid),
      },
      select: {
        description: true,
        attendees: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });
  }

  return {
    props: {
      profile: {
        slug: user.username,
        name: user.name,
        image: user.avatar,
        theme: user.theme,
        brandColor: user.brandColor,
      },
      eventType: eventTypeObject,
      booking,
      trpcState: ssr.dehydrate(),
    },
  };
}
