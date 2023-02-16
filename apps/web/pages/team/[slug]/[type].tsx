import { GetServerSidePropsContext } from "next";

import { privacyFilteredLocations, LocationObject } from "@calcom/core/location";
import { parseRecurringEvent } from "@calcom/lib";
import { getWorkingHours } from "@calcom/lib/availability";
import prisma from "@calcom/prisma";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { asStringOrNull } from "@lib/asStringOrNull";
import getBooking, { GetBookingType } from "@lib/getBooking";
import { inferSSRProps } from "@lib/types/inferSSRProps";
import { EmbedProps } from "@lib/withEmbedSsr";

import AvailabilityPage from "@components/booking/pages/AvailabilityPage";

import { ssgInit } from "@server/lib/ssg";

export type AvailabilityTeamPageProps = inferSSRProps<typeof getServerSideProps> & EmbedProps;

export default function TeamType(props: AvailabilityTeamPageProps) {
  return <AvailabilityPage {...props} />;
}
TeamType.isThemeSupported = true;

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const slugParam = asStringOrNull(context.query.slug);
  const typeParam = asStringOrNull(context.query.type);
  const dateParam = asStringOrNull(context.query.date);
  const rescheduleUid = asStringOrNull(context.query.rescheduleUid);
  const ssg = await ssgInit(context);

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
      hideBranding: true,
      brandColor: true,
      darkBrandColor: true,
      theme: true,
      eventTypes: {
        where: {
          slug: typeParam,
        },
        select: {
          id: true,
          slug: true,
          hidden: true,
          hosts: {
            select: {
              isFixed: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                  username: true,
                  timeZone: true,
                  hideBranding: true,
                  brandColor: true,
                  darkBrandColor: true,
                },
              },
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
          recurringEvent: true,
          requiresConfirmation: true,
          locations: true,
          price: true,
          currency: true,
          timeZone: true,
          slotInterval: true,
          metadata: true,
          seatsPerTimeSlot: true,
          schedule: {
            select: {
              timeZone: true,
              availability: true,
            },
          },
          team: {
            select: {
              members: {
                where: {
                  role: "OWNER",
                },
                select: {
                  user: {
                    select: {
                      weekStart: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!team || team.eventTypes.length != 1) {
    return {
      notFound: true,
    } as {
      notFound: true;
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

  const locations = eventType.locations ? (eventType.locations as LocationObject[]) : [];
  const eventTypeObject = Object.assign({}, eventType, {
    metadata: EventTypeMetaDataSchema.parse(eventType.metadata || {}),
    periodStartDate: eventType.periodStartDate?.toString() ?? null,
    periodEndDate: eventType.periodEndDate?.toString() ?? null,
    recurringEvent: parseRecurringEvent(eventType.recurringEvent),
    locations: privacyFilteredLocations(locations),
    users: eventType.hosts.map(({ user: { name, username, hideBranding, timeZone } }) => ({
      name,
      username,
      hideBranding,
      timeZone,
    })),
  });

  eventTypeObject.availability = [];

  let booking: GetBookingType | null = null;
  if (rescheduleUid) {
    booking = await getBooking(prisma, rescheduleUid);
  }

  const weekStart = eventType.team?.members?.[0]?.user?.weekStart;

  return {
    props: {
      profile: {
        name: team.name || team.slug,
        slug: team.slug,
        image: team.logo,
        theme: team.theme,
        weekStart: weekStart ?? "Sunday",
        brandColor: team.brandColor,
        darkBrandColor: team.darkBrandColor,
      },
      date: dateParam,
      eventType: eventTypeObject,
      workingHours,
      previousPage: context.req.headers.referer ?? null,
      booking,
      trpcState: ssg.dehydrate(),
      isBrandingHidden: team.hideBranding,
    },
  };
};
