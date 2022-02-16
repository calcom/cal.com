import { Prisma } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import { JSONObject } from "superjson/dist/types";

import { asStringOrNull } from "@lib/asStringOrNull";
import { getWorkingHours } from "@lib/availability";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import AvailabilityPage from "@components/booking/pages/AvailabilityPage";

import { ssrInit } from "@server/lib/ssr";

export type AvailabilityPageProps = inferSSRProps<typeof getServerSideProps>;

export default function Type(props: AvailabilityPageProps) {
  return <AvailabilityPage {...props} />;
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);
  // get query params and typecast them to string
  // (would be even better to assert them instead of typecasting)
  const userParam = asStringOrNull(context.query.user);
  const typeParam = asStringOrNull(context.query.type);
  const dateParam = asStringOrNull(context.query.date);

  if (!userParam || !typeParam) {
    throw new Error(`File is not named [type]/[user]`);
  }

  const eventTypeSelect = Prisma.validator<Prisma.EventTypeSelect>()({
    id: true,
    title: true,
    availability: true,
    description: true,
    length: true,
    price: true,
    currency: true,
    periodType: true,
    periodStartDate: true,
    periodEndDate: true,
    periodDays: true,
    periodCountCalendarDays: true,
    schedulingType: true,
    minimumBookingNotice: true,
    timeZone: true,
    metadata: true,
    slotInterval: true,
    users: {
      select: {
        avatar: true,
        name: true,
        username: true,
        hideBranding: true,
        plan: true,
        timeZone: true,
      },
    },
  });

  const user = await prisma.user.findUnique({
    where: {
      username: userParam.toLowerCase(),
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      bio: true,
      avatar: true,
      startTime: true,
      endTime: true,
      timeZone: true,
      weekStart: true,
      availability: true,
      hideBranding: true,
      brandColor: true,
      theme: true,
      plan: true,
      eventTypes: {
        where: {
          AND: [
            {
              slug: typeParam,
            },
            {
              teamId: null,
            },
          ],
        },
        select: eventTypeSelect,
      },
    },
  });

  if (!user) {
    return {
      notFound: true,
    };
  }

  if (user.eventTypes.length !== 1) {
    const eventTypeBackwardsCompat = await prisma.eventType.findFirst({
      where: {
        AND: [
          {
            userId: user.id,
          },
          {
            slug: typeParam,
          },
        ],
      },
      select: eventTypeSelect,
    });
    if (!eventTypeBackwardsCompat) {
      return {
        notFound: true,
      };
    }

    eventTypeBackwardsCompat.users.push({
      avatar: user.avatar,
      name: user.name,
      username: user.username,
      hideBranding: user.hideBranding,
      plan: user.plan,
      timeZone: user.timeZone,
    });

    user.eventTypes.push(eventTypeBackwardsCompat);
  }

  const [eventType] = user.eventTypes;

  // check this is the first event

  // TEMPORARILY disabled because of a bug during event create - during which users were able
  // to create event types >n1.
  /*if (user.plan === "FREE") {
    const firstEventType = await prisma.eventType.findFirst({
      where: {
        OR: [
          {
            userId: user.id,
          },
          {
            users: {
              some: {
                id: user.id,
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });
    if (firstEventType?.id !== eventType.id) {
      return {
        notFound: true,
      } as const;
    }
  }*/

  const eventTypeObject = Object.assign({}, eventType, {
    metadata: (eventType.metadata || {}) as JSONObject,
    periodStartDate: eventType.periodStartDate?.toString() ?? null,
    periodEndDate: eventType.periodEndDate?.toString() ?? null,
  });

  const workingHours = getWorkingHours(
    {
      timeZone: eventType.timeZone || user.timeZone,
    },
    eventType.availability.length ? eventType.availability : user.availability
  );

  eventTypeObject.availability = [];

  return {
    props: {
      profile: {
        name: user.name,
        image: user.avatar,
        slug: user.username,
        theme: user.theme,
        weekStart: user.weekStart,
        brandColor: user.brandColor,
      },
      date: dateParam,
      eventType: eventTypeObject,
      workingHours,
      trpcState: ssr.dehydrate(),
    },
  };
};
