import { Prisma } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import { JSONObject } from "superjson/dist/types";

import { asStringOrNull } from "@lib/asStringOrNull";
import { getWorkingHours } from "@lib/availability";
import { getDefaultEvent, getGroupName } from "@lib/events/DefaultEvents";
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
  const usernameList = (context.query.user as string)
    .toLowerCase()
    .split("+")
    .filter((el) => {
      return el.length != 0;
    });

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
      startTime: true,
      endTime: true,
      timeZone: true,
      weekStart: true,
      availability: true,
      hideBranding: true,
      brandColor: true,
      darkBrandColor: true,
      defaultScheduleId: true,
      schedules: {
        select: {
          availability: true,
          timeZone: true,
          id: true,
        },
      },
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

  if (!users) {
    return {
      notFound: true,
    };
  }

  if (users.length < 2 && users[0].eventTypes.length !== 1) {
    const eventTypeBackwardsCompat = await prisma.eventType.findFirst({
      where: {
        AND: [
          {
            userId: users[0].id,
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
      avatar: users[0].avatar,
      name: users[0].name,
      username: users[0].username,
      hideBranding: users[0].hideBranding,
      plan: users[0].plan,
      timeZone: users[0].timeZone,
    });

    users[0].eventTypes.push(eventTypeBackwardsCompat);
  }

  let [eventType] = users[0].eventTypes;
  if (users.length > 1) {
    eventType = getDefaultEvent(typeParam);
    eventType["users"] = users.map((user) => {
      return {
        avatar: user.avatar as string,
        name: user.name as string,
        username: user.username as string,
        hideBranding: user.hideBranding,
        plan: user.plan,
        timeZone: user.timeZone as string,
      };
    });
  }

  // check this is the first event
  if (users.length < 2 && users[0].plan === "FREE") {
    const firstEventType = await prisma.eventType.findFirst({
      where: {
        OR: [
          {
            userId: users[0].id,
          },
          {
            users: {
              some: {
                id: users[0].id,
              },
            },
          },
        ],
      },
      orderBy: [
        {
          position: "desc",
        },
        {
          id: "asc",
        },
      ],
      select: {
        id: true,
      },
    });
    if (firstEventType?.id !== eventType.id) {
      return {
        notFound: true,
      } as const;
    }
  }

  const eventTypeObject = Object.assign({}, eventType, {
    metadata: (eventType.metadata || {}) as JSONObject,
    periodStartDate: eventType.periodStartDate?.toString() ?? null,
    periodEndDate: eventType.periodEndDate?.toString() ?? null,
  });

  const schedule = eventType.schedule
    ? { ...eventType.schedule }
    : {
        ...users[0].schedules.filter(
          (schedule) => !users[0].defaultScheduleId || schedule.id === users[0].defaultScheduleId
        )[0],
      };

  const timeZone =
    users.length > 1 ? undefined : schedule.timeZone || eventType.timeZone || users[0].timeZone;

  const workingHours = getWorkingHours(
    {
      timeZone,
    },
    users.length > 1
      ? eventType.availability || undefined
      : schedule.availability ||
          (eventType.availability.length ? eventType.availability : users[0].availability)
  );
  eventTypeObject.schedule = null;
  eventTypeObject.availability = [];

  const profile =
    users.length > 1
      ? {
          name: getGroupName(usernameList),
          image: null,
          slug: typeParam,
          theme: null,
          weekStart: "Sunday",
          brandColor: "",
          darkBrandColor: "",
        }
      : {
          name: users[0].name || users[0].username,
          image: users[0].avatar,
          slug: users[0].username,
          theme: users[0].theme,
          weekStart: users[0].weekStart,
          brandColor: users[0].brandColor,
          darkBrandColor: users[0].darkBrandColor,
        };

  return {
    props: {
      profile,
      date: dateParam,
      eventType: eventTypeObject,
      workingHours,
      trpcState: ssr.dehydrate(),
      previousPage: context.req.headers.referer ?? null,
    },
  };
};
