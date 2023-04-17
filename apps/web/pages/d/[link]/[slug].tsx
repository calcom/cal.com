import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import type { LocationObject } from "@calcom/core/location";
import { privacyFilteredLocations } from "@calcom/core/location";
import { parseRecurringEvent } from "@calcom/lib";
import { getWorkingHours } from "@calcom/lib/availability";
import type { GetBookingType } from "@calcom/lib/getBooking";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { availiblityPageEventTypeSelect } from "@calcom/prisma";
import prisma from "@calcom/prisma";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import type { inferSSRProps } from "@lib/types/inferSSRProps";
import type { EmbedProps } from "@lib/withEmbedSsr";

import AvailabilityPage from "@components/booking/pages/AvailabilityPage";

import { ssrInit } from "@server/lib/ssr";

export type DynamicAvailabilityPageProps = inferSSRProps<typeof getServerSideProps> & EmbedProps;

export default function Type(props: DynamicAvailabilityPageProps) {
  return <AvailabilityPage {...props} />;
}

Type.isBookingPage = true;

const querySchema = z.object({
  link: z.string().optional().default(""),
  slug: z.string().optional().default(""),
  date: z.union([z.string(), z.null()]).optional().default(null),
});

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);
  const { link, slug, date } = querySchema.parse(context.query);

  const hashedLink = await prisma.hashedLink.findUnique({
    where: {
      link,
    },
    select: {
      eventTypeId: true,
      eventType: {
        select: availiblityPageEventTypeSelect,
      },
    },
  });

  const userId = hashedLink?.eventType.userId || hashedLink?.eventType.users[0]?.id;
  if (!userId)
    return {
      notFound: true,
    } as {
      notFound: true;
    };

  if (hashedLink?.eventType.slug !== slug)
    return {
      notFound: true,
    } as {
      notFound: true;
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
    },
  });

  if (!users || !users.length) {
    return {
      notFound: true,
    } as {
      notFound: true;
    };
  }

  const locations = hashedLink.eventType.locations
    ? (hashedLink.eventType.locations as LocationObject[])
    : [];

  const eventTypeObject = Object.assign({}, hashedLink.eventType, {
    metadata: EventTypeMetaDataSchema.parse(hashedLink.eventType.metadata || {}),
    recurringEvent: parseRecurringEvent(hashedLink.eventType.recurringEvent),
    periodStartDate: hashedLink.eventType.periodStartDate?.toString() ?? null,
    periodEndDate: hashedLink.eventType.periodEndDate?.toString() ?? null,
    slug,
    locations: privacyFilteredLocations(locations),
    users: users.map((u) => ({
      name: u.name,
      username: u.username,
      hideBranding: u.hideBranding,
      timeZone: u.timeZone,
    })),
    descriptionAsSafeHTML: markdownToSafeHTML(hashedLink.eventType.description),
  });

  const [user] = users;

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
      date,
      eventType: eventTypeObject,
      workingHours,
      trpcState: ssr.dehydrate(),
      previousPage: context.req.headers.referer ?? null,
      booking,
      users: [user.username],
      isBrandingHidden: user.hideBranding,
    },
  };
};
