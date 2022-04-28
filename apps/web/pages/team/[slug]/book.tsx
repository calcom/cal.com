import { Prisma } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import { JSONObject } from "superjson/dist/types";

import { getLocationLabels } from "@calcom/app-store/utils";

import { asStringOrThrow } from "@lib/asStringOrNull";
import getBooking, { GetBookingType } from "@lib/getBooking";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import BookingPage from "@components/booking/pages/BookingPage";

import { getTranslation } from "@server/lib/i18n";

export type TeamBookingPageProps = inferSSRProps<typeof getServerSideProps>;

export default function TeamBookingPage(props: TeamBookingPageProps) {
  return <BookingPage {...props} />;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const eventTypeId = parseInt(asStringOrThrow(context.query.type));
  if (typeof eventTypeId !== "number" || eventTypeId % 1 !== 0) {
    return {
      notFound: true,
    } as const;
  }

  const eventType = await prisma.eventType.findUnique({
    where: {
      id: eventTypeId,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      length: true,
      locations: true,
      customInputs: true,
      periodType: true,
      periodDays: true,
      periodStartDate: true,
      periodEndDate: true,
      periodCountCalendarDays: true,
      disableGuests: true,
      price: true,
      currency: true,
      metadata: true,
      team: {
        select: {
          slug: true,
          name: true,
          logo: true,
        },
      },
      users: {
        select: {
          id: true,
          avatar: true,
          name: true,
        },
      },
    },
  });

  if (!eventType) return { notFound: true };

  const eventTypeObject = [eventType].map((e) => {
    return {
      ...e,
      metadata: (eventType.metadata || {}) as JSONObject,
      periodStartDate: e.periodStartDate?.toString() ?? null,
      periodEndDate: e.periodEndDate?.toString() ?? null,
    };
  })[0];

  let booking: GetBookingType | null = null;
  if (context.query.rescheduleUid) {
    booking = await getBooking(prisma, context.query.rescheduleUid as string);
  }

  const t = await getTranslation(context.locale ?? "en", "common");

  return {
    props: {
      locationLabels: getLocationLabels(t),
      profile: {
        ...eventTypeObject.team,
        slug: "team/" + eventTypeObject.slug,
        image: eventTypeObject.team?.logo || null,
        theme: null /* Teams don't have a theme, and `BookingPage` uses it */,
        brandColor: null /* Teams don't have a brandColor, and `BookingPage` uses it */,
        darkBrandColor: null /* Teams don't have a darkBrandColor, and `BookingPage` uses it */,
        eventName: null,
      },
      eventType: eventTypeObject,
      booking,
      isDynamicGroupBooking: false,
      hasHashedBookingLink: false,
      hashedLink: null,
    },
  };
}
