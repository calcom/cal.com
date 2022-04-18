import { Prisma } from "@prisma/client";
import { UserPlan } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import { JSONObject } from "superjson/dist/types";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { asStringOrNull } from "@lib/asStringOrNull";
import { getWorkingHours } from "@lib/availability";
import getBooking, { GetBookingType } from "@lib/getBooking";
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
  const link = asStringOrNull(context.query.link) || "";
  const slug = asStringOrNull(context.query.slug) || "";
  const dateParam = asStringOrNull(context.query.date);

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
    userId: true,
    schedule: {
      select: {
        availability: true,
        timeZone: true,
      },
    },
    hidden: true,
    slug: true,
    minimumBookingNotice: true,
    beforeEventBuffer: true,
    afterEventBuffer: true,
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

  const disposableType = await prisma.disposableLink.findUnique({
    where: {
      link_slug: {
        link,
        slug,
      },
    },
    select: {
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
      userId: true,
      eventType: {
        select: eventTypeSelect,
      },
      timeZone: true,
      expired: true,
    },
  });

  // Handle expired links here
  const linkExpired = disposableType?.expired;
  if (linkExpired) {
    return {
      notFound: true,
    };
  }

  const userId = disposableType?.userId || disposableType?.eventType.userId;

  if (!userId)
    return {
      notFound: true,
    };

  const users = await prisma.user.findMany({
    where: {
      id: userId,
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
      darkBrandColor: true,
      defaultScheduleId: true,
      allowDynamicBooking: true,
      schedules: {
        select: {
          availability: true,
          timeZone: true,
          id: true,
        },
      },
      theme: true,
      plan: true,
    },
  });

  if (!users || !users.length) {
    return {
      notFound: true,
    };
  }
  const [user] = users;
  const eventTypeObject = Object.assign({}, disposableType.eventType, {
    metadata: {} as JSONObject,
    periodStartDate: null,
    periodEndDate: null,
    slug,
  });

  const schedule = {
    ...user.schedules.filter(
      (schedule) => !user.defaultScheduleId || schedule.id === user.defaultScheduleId
    )[0],
  };

  const timeZone = schedule.timeZone || disposableType.timeZone || user.timeZone;

  const workingHours = getWorkingHours(
    {
      timeZone,
    },
    schedule.availability ||
      (disposableType.eventType.availability.length
        ? disposableType.eventType.availability
        : user.availability)
  );
  eventTypeObject.schedule = null;
  eventTypeObject.availability = [];

  let booking: GetBookingType | null = null;

  const profile = {
    name: user.name || user.username,
    image: user.avatar,
    slug: user.username,
    theme: user.theme,
    weekStart: user.weekStart,
    brandColor: user.brandColor,
    darkBrandColor: user.darkBrandColor,
  };

  return {
    props: {
      isDynamicGroup: false,
      profile,
      plan: user.plan,
      date: dateParam,
      eventType: eventTypeObject,
      workingHours,
      trpcState: ssr.dehydrate(),
      previousPage: context.req.headers.referer ?? null,
      booking,
    },
  };
};
