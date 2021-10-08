import { Prisma } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import { asStringOrNull } from "@lib/asStringOrNull";
import { extractLocaleInfo } from "@lib/core/i18n/i18n.utils";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import AvailabilityPage from "@components/booking/pages/AvailabilityPage";

export type AvailabilityPageProps = inferSSRProps<typeof getServerSideProps>;

export default function Type(props: AvailabilityPageProps) {
  return <AvailabilityPage {...props} />;
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const locale = await extractLocaleInfo(context.req);
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
    users: {
      select: {
        avatar: true,
        name: true,
        username: true,
        hideBranding: true,
        plan: true,
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
  const getWorkingHours = (availability: typeof user.availability | typeof eventType.availability) =>
    availability && availability.length ? availability : null;

  const workingHours =
    getWorkingHours(eventType.availability) ||
    getWorkingHours(user.availability) ||
    [
      {
        days: [0, 1, 2, 3, 4, 5, 6],
        startTime: user.startTime,
        endTime: user.endTime,
      },
    ].filter((availability): boolean => typeof availability["days"] !== "undefined");

  workingHours.sort((a, b) => a.startTime - b.startTime);

  const eventTypeObject = Object.assign({}, eventType, {
    periodStartDate: eventType.periodStartDate?.toString() ?? null,
    periodEndDate: eventType.periodEndDate?.toString() ?? null,
  });

  return {
    props: {
      localeProp: locale,
      profile: {
        name: user.name,
        image: user.avatar,
        slug: user.username,
        theme: user.theme,
        weekStart: user.weekStart,
      },
      date: dateParam,
      eventType: eventTypeObject,
      workingHours,
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
};
