import { User } from "@prisma/client";
import { asStringOrNull } from "@lib/asStringOrNull";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";
import { GetServerSidePropsContext } from "next";
import AvailabilityPage from "@components/booking/pages/AvailabilityPage";

export default function Type(props: inferSSRProps<typeof getServerSideProps>) {
  return <AvailabilityPage {...props} />;
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  // get query params and typecast them to string
  // (would be even better to assert them instead of typecasting)
  const userParam = asStringOrNull(context.query.user);
  const typeParam = asStringOrNull(context.query.type);
  const dateParam = asStringOrNull(context.query.date);

  if (!userParam || !typeParam) {
    throw new Error(`File is not named [type]/[user]`);
  }

  const user: User = await prisma.user.findUnique({
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
        select: {
          id: true,
          title: true,
          availability: true,
          description: true,
          length: true,
          users: {
            select: {
              avatar: true,
              name: true,
              username: true,
            },
          },
        },
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
      select: {
        id: true,
        title: true,
        availability: true,
        description: true,
        length: true,
        users: {
          select: {
            avatar: true,
            name: true,
            username: true,
          },
        },
      },
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
    });
    user.eventTypes.push(eventTypeBackwardsCompat);
  }

  const eventType = user.eventTypes[0];

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
  const getWorkingHours = (providesAvailability: { availability: Availability[] }) =>
    providesAvailability.availability && providesAvailability.availability.length
      ? providesAvailability.availability
      : null;

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
      profile: {
        name: user.name,
        image: user.avatar,
        slug: user.username,
        theme: user.theme,
      },
      date: dateParam,
      eventType: eventTypeObject,
      workingHours,
    },
  };
};
