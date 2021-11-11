import { GetServerSidePropsContext } from "next";

import { asStringOrNull } from "@lib/asStringOrNull";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import AvailabilityPage from "@components/booking/pages/AvailabilityPage";

export type AvailabilityTeamPageProps = inferSSRProps<typeof getServerSideProps>;

export default function TeamType(props: AvailabilityTeamPageProps) {
  return <AvailabilityPage {...props} />;
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const slugParam = asStringOrNull(context.query.slug);
  const typeParam = asStringOrNull(context.query.type);
  const dateParam = asStringOrNull(context.query.date);

  if (!slugParam || !typeParam) {
    throw new Error(`File is not named [idOrSlug]/[user]`);
  }

  const team = await prisma.team.findFirst({
    where: {
      slug: slugParam,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      eventTypes: {
        where: {
          slug: typeParam,
        },
        select: {
          id: true,
          users: {
            select: {
              id: true,
              name: true,
              avatar: true,
              username: true,
              timeZone: true,
            },
          },
          title: true,
          availability: true,
          description: true,
          length: true,
          schedulingType: true,
          periodStartDate: true,
          periodEndDate: true,
        },
      },
    },
  });

  if (!team || team.eventTypes.length != 1) {
    return {
      notFound: true,
    };
  }

  const [eventType] = team.eventTypes;

  type Availability = typeof eventType["availability"];
  const getWorkingHours = (availability: Availability) =>
    availability?.length
      ? availability.map((schedule) => ({
          ...schedule,
          startTime: schedule.startTime.getUTCHours() * 60 + schedule.startTime.getUTCMinutes(),
          endTime: schedule.endTime.getUTCHours() * 60 + schedule.endTime.getUTCMinutes(),
        }))
      : null;
  const workingHours =
    getWorkingHours(eventType.availability) ||
    [
      {
        days: [0, 1, 2, 3, 4, 5, 6],
        startTime: 0,
        endTime: 1440,
      },
    ].filter((availability): boolean => typeof availability["days"] !== "undefined");

  workingHours.sort((a, b) => a.startTime - b.startTime);

  const eventTypeObject = Object.assign({}, eventType, {
    periodStartDate: eventType.periodStartDate?.toString() ?? null,
    periodEndDate: eventType.periodEndDate?.toString() ?? null,
  });

  eventTypeObject.availability = [];

  return {
    props: {
      profile: {
        name: team.name,
        slug: team.slug,
        image: team.logo || null,
        theme: null,
      },
      date: dateParam,
      eventType: eventTypeObject,
      workingHours,
    },
  };
};
