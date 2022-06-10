import { Prisma } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import { JSONObject } from "superjson/dist/types";

import { parseRecurringEvent } from "@calcom/lib";

import { asStringOrNull } from "@lib/asStringOrNull";
import { getWorkingHours } from "@lib/availability";
import { GetBookingType } from "@lib/getBooking";
import { locationHiddenFilter, LocationObject } from "@lib/location";
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
    recurringEvent: true,
    schedulingType: true,
    seatsPerTimeSlot: true,
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
    locations: true,
    timeZone: true,
    metadata: true,
    slotInterval: true,
    users: {
      select: {
        id: true,
        avatar: true,
        name: true,
        username: true,
        hideBranding: true,
        plan: true,
        timeZone: true,
      },
    },
  });

  const hashedLink = await prisma.hashedLink.findUnique({
    where: {
      link,
    },
    select: {
      eventTypeId: true,
      eventType: {
        select: eventTypeSelect,
      },
    },
  });

  const userId = hashedLink?.eventType.userId || hashedLink?.eventType.users[0]?.id;
  if (!userId)
    return {
      notFound: true,
    };

  if (hashedLink?.eventType.slug !== slug)
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
      away: true,
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

  const locations = hashedLink.eventType.locations
    ? (hashedLink.eventType.locations as LocationObject[])
    : [];

  const [user] = users;
  const eventTypeObject = Object.assign({}, hashedLink.eventType, {
    metadata: {} as JSONObject,
    recurringEvent: parseRecurringEvent(hashedLink.eventType.recurringEvent),
    periodStartDate: hashedLink.eventType.periodStartDate?.toString() ?? null,
    periodEndDate: hashedLink.eventType.periodEndDate?.toString() ?? null,
    slug,
    locations: locationHiddenFilter(locations),
  });

  const schedule = {
    ...user.schedules.filter(
      (schedule) => !user.defaultScheduleId || schedule.id === user.defaultScheduleId
    )[0],
  };

  const timeZone = schedule.timeZone || user.timeZone;

  const workingHours = getWorkingHours(
    {
      timeZone,
    },
    schedule.availability || user.availability
  );
  eventTypeObject.schedule = null;
  eventTypeObject.availability = [];

  const booking: GetBookingType | null = null;

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
      away: user.away,
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
