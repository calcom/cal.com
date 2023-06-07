import type { GetServerSidePropsContext } from "next";

import { parseRecurringEvent } from "@calcom/lib";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import prisma from "@calcom/prisma";
import { bookEventTypeSelect } from "@calcom/prisma/selects";
import { customInputSchema, eventTypeBookingFields, EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { asStringOrNull, asStringOrThrow } from "@lib/asStringOrNull";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

import PageWrapper from "@components/PageWrapper";
import BookingPage from "@components/booking/pages/BookingPage";

import { ssrInit } from "@server/lib/ssr";

export type HashLinkPageProps = inferSSRProps<typeof getServerSideProps>;

export default function Book(props: HashLinkPageProps) {
  return <BookingPage {...props} />;
}

Book.isBookingPage = true;
Book.PageWrapper = PageWrapper;

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const ssr = await ssrInit(context);
  const link = asStringOrThrow(context.query.link as string);
  const recurringEventCountQuery = asStringOrNull(context.query.count);

  const hashedLink = await prisma.hashedLink.findUnique({
    where: {
      link,
    },
    select: {
      eventTypeId: true,
      eventType: {
        select: bookEventTypeSelect,
      },
    },
  });

  const userId = hashedLink?.eventType.userId || hashedLink?.eventType.users[0]?.id;

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
      theme: true,
      brandColor: true,
      darkBrandColor: true,
      allowDynamicBooking: true,
    },
  });

  if (!users.length) return { notFound: true };
  const [user] = users;
  const eventTypeRaw = hashedLink?.eventType;

  if (!eventTypeRaw) return { notFound: true };
  const eventType = {
    ...eventTypeRaw,
    metadata: EventTypeMetaDataSchema.parse(eventTypeRaw.metadata || {}),
    recurringEvent: parseRecurringEvent(eventTypeRaw.recurringEvent),
    bookingFields: eventTypeBookingFields.parse(eventTypeRaw.bookingFields || []),
  };

  const eventTypeObject = [eventType].map((e) => {
    return {
      ...e,
      periodStartDate: e.periodStartDate?.toString() ?? null,
      periodEndDate: e.periodEndDate?.toString() ?? null,
      customInputs: customInputSchema.array().parse(e.customInputs || []),
      schedulingType: null,
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        avatar: u.avatar,
        image: u.avatar,
        slug: u.username,
        theme: u.theme,
        email: u.email,
        brandColor: u.brandColor,
        darkBrandColor: u.darkBrandColor,
      })),
      descriptionAsSafeHTML: markdownToSafeHTML(eventType.description),
    };
  })[0];

  const profile = {
    name: user.name || user.username,
    image: user.avatar,
    slug: user.username,
    theme: user.theme,
    brandColor: user.brandColor,
    darkBrandColor: user.darkBrandColor,
    eventName: null,
  };

  // Checking if number of recurring event ocurrances is valid against event type configuration
  const recurringEventCount =
    (eventTypeObject.recurringEvent?.count &&
      recurringEventCountQuery &&
      (parseInt(recurringEventCountQuery) <= eventTypeObject.recurringEvent.count
        ? parseInt(recurringEventCountQuery)
        : eventType.recurringEvent?.count)) ||
    null;

  return {
    props: {
      profile,
      themeBasis: user.username,
      eventType: eventTypeObject,
      booking: null,
      currentSlotBooking: null,
      trpcState: ssr.dehydrate(),
      recurringEventCount,
      isDynamicGroupBooking: false,
      hasHashedBookingLink: true,
      hashedLink: link,
      isEmbed: typeof context.query.embed === "string",
    },
  };
}
