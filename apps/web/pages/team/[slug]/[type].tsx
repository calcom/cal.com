import type { GetServerSidePropsContext } from "next";

import type { LocationObject } from "@calcom/core/location";
import { privacyFilteredLocations } from "@calcom/core/location";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import getBooking from "@calcom/features/bookings/lib/get-booking";
import { parseRecurringEvent } from "@calcom/lib";
import { getWorkingHours } from "@calcom/lib/availability";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import prisma from "@calcom/prisma";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { asStringOrNull } from "@lib/asStringOrNull";
import type { inferSSRProps } from "@lib/types/inferSSRProps";
import type { EmbedProps } from "@lib/withEmbedSsr";

import PageWrapper from "@components/PageWrapper";
import AvailabilityPage from "@components/booking/pages/AvailabilityPage";

import { ssgInit } from "@server/lib/ssg";

export type AvailabilityTeamPageProps = inferSSRProps<typeof getServerSideProps> & EmbedProps;

export default function TeamType(props: AvailabilityTeamPageProps) {
  return <AvailabilityPage {...props} />;
}

TeamType.isBookingPage = true;
TeamType.PageWrapper = PageWrapper;

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
          disableGuests: true,
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
          bookingFields: true,
          customInputs: true,
          schedule: {
            select: {
              timeZone: true,
              availability: true,
            },
          },
          workflows: {
            select: {
              workflow: {
                select: {
                  id: true,
                  steps: true,
                },
              },
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
    descriptionAsSafeHTML: markdownToSafeHTML(eventType.description),
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
