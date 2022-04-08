import { GetServerSidePropsContext } from "next";
import { JSONObject } from "superjson/dist/types";

import { UserPlan } from "@calcom/prisma/client";

import { asStringOrNull } from "@lib/asStringOrNull";
import { getWorkingHours } from "@lib/availability";
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
  const rescheduleUid = asStringOrNull(context.query.rescheduleUid);

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
              hideBranding: true,
              plan: true,
              brandColor: true,
              darkBrandColor: true,
            },
          },
          title: true,
          availability: true,
          description: true,
          length: true,
          schedulingType: true,
          periodType: true,
          periodStartDate: true,
          periodEndDate: true,
          periodDays: true,
          periodCountCalendarDays: true,
          minimumBookingNotice: true,
          beforeEventBuffer: true,
          afterEventBuffer: true,
          price: true,
          currency: true,
          timeZone: true,
          slotInterval: true,
          metadata: true,
          schedule: {
            select: {
              timeZone: true,
              availability: true,
            },
          },
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

  const timeZone = eventType.schedule?.timeZone || eventType.timeZone || undefined;

  const workingHours = getWorkingHours(
    {
      timeZone,
    },
    eventType.schedule?.availability || eventType.availability
  );

  eventType.schedule = null;

  const eventTypeObject = Object.assign({}, eventType, {
    metadata: (eventType.metadata || {}) as JSONObject,
    periodStartDate: eventType.periodStartDate?.toString() ?? null,
    periodEndDate: eventType.periodEndDate?.toString() ?? null,
  });

  eventTypeObject.availability = [];

  type Booking = {
    startTime: Date | string;
    description: string | null;
    attendees?: {
      email: string;
      name: string;
    }[];
  } | null;
  // @NOTE: being used several times refactor to exported function
  async function getBooking(rescheduleUid: string): Promise<Booking> {
    return await prisma.booking.findFirst({
      where: {
        uid: rescheduleUid,
      },
      select: {
        startTime: true,
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

  let booking: Booking | null = null;
  if (rescheduleUid) {
    booking = await getBooking(rescheduleUid);
    if (booking) {
      // @NOTE: had to do this because Server side cant return [Object objects]
      // probably fixable with json.stringify -> json.parse
      booking["startTime"] = (booking?.startTime as Date)?.toISOString();
    }
  }

  return {
    props: {
      // Team is always pro
      plan: "PRO" as UserPlan,
      profile: {
        name: team.name || team.slug,
        slug: team.slug,
        image: team.logo,
        theme: null,
        weekStart: "Sunday",
        brandColor: "" /* TODO: Add a way to set a brand color for Teams */,
        darkBrandColor: "" /* TODO: Add a way to set a brand color for Teams */,
      },
      date: dateParam,
      eventType: eventTypeObject,
      workingHours,
      previousPage: context.req.headers.referer ?? null,
      booking,
    },
  };
};
