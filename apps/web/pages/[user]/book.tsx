import { Prisma } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { GetServerSidePropsContext } from "next";
import { JSONObject } from "superjson/dist/types";

import { asStringOrThrow } from "@lib/asStringOrNull";
import { getDefaultEvent, getGroupName } from "@lib/events/DefaultEvents";
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
  const usernameList = asStringOrThrow(context.query.user as string)
    .toLowerCase()
    .split("+")
    .filter((el) => {
      return el.length != 0;
    });
  const eventTypeSlug = context.query.slug as string;
  const users = await prisma.user.findMany({
    where: {
      username: {
        in: usernameList,
      },
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      bio: true,
      avatar: true,
      theme: true,
      brandColor: true,
      darkBrandColor: true,
    },
  });

  if (!users.length) return { notFound: true };

  const eventTypeRaw =
    usernameList.length > 1
      ? getDefaultEvent(eventTypeSlug)
      : await prisma.eventType.findUnique({
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
            metadata: true,
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

  if (!eventTypeRaw) return { notFound: true };

  const credentials = await prisma.credential.findMany({
    where: {
      userId: {
        in: users.map((user) => user.id),
      },
    },
    select: {
      id: true,
      type: true,
      key: true,
    },
  });

  const web3Credentials = credentials.find((credential) => credential.type.includes("_web3"));

  const eventType = {
    ...eventTypeRaw,
    metadata: (eventTypeRaw.metadata || {}) as JSONObject,
    isWeb3Active:
      web3Credentials && web3Credentials.key
        ? (((web3Credentials.key as JSONObject).isWeb3Active || false) as boolean)
        : false,
  };

  const eventTypeObject = [eventType].map((e) => {
    return {
      ...e,
      periodStartDate: e.periodStartDate?.toString() ?? null,
      periodEndDate: e.periodEndDate?.toString() ?? null,
    };
  })[0];

  async function getBooking() {
    return prisma.booking.findFirst({
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

  type Booking = Prisma.PromiseReturnType<typeof getBooking>;
  let booking: Booking | null = null;

  if (context.query.rescheduleUid) {
    booking = await getBooking();
  }

  const isDynamicGroupBooking = users.length > 1 ? true : false;

  const profile =
    users.length > 1
      ? {
          name: getGroupName(usernameList),
          image: null,
          slug: eventTypeSlug,
          theme: null,
          brandColor: "",
          darkBrandColor: "",
        }
      : {
          name: users[0].name || users[0].username,
          image: users[0].avatar,
          slug: users[0].username,
          theme: users[0].theme,
          brandColor: users[0].brandColor,
          darkBrandColor: users[0].darkBrandColor,
        };

  return {
    props: {
      profile,
      eventType: eventTypeObject,
      booking,
      trpcState: ssr.dehydrate(),
      isDynamicGroupBooking,
    },
  };
}
