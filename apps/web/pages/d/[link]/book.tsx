import { Prisma } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { GetServerSidePropsContext } from "next";
import { JSONObject } from "superjson/dist/types";

import { getLocationLabels } from "@calcom/app-store/utils";
import { RecurringEvent } from "@calcom/types/Calendar";

import { asStringOrThrow, asStringOrNull } from "@lib/asStringOrNull";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import BookingPage from "@components/booking/pages/BookingPage";

import { getTranslation } from "@server/lib/i18n";
import { ssrInit } from "@server/lib/ssr";

dayjs.extend(utc);
dayjs.extend(timezone);

export type HashLinkPageProps = inferSSRProps<typeof getServerSideProps>;

export default function Book(props: HashLinkPageProps) {
  return <BookingPage {...props} />;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const ssr = await ssrInit(context);
  const link = asStringOrThrow(context.query.link as string);
  const recurringEventCountQuery = asStringOrNull(context.query.count);

  const eventTypeSelect = Prisma.validator<Prisma.EventTypeSelect>()({
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
    recurringEvent: true,
    periodEndDate: true,
    metadata: true,
    periodCountCalendarDays: true,
    price: true,
    currency: true,
    disableGuests: true,
    userId: true,
    users: {
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        bio: true,
        avatar: true,
        theme: true,
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

  const credentials = await prisma.credential.findMany({
    where: {
      userId: {
        in: users.map((user) => user.id),
      },
    },
    select: {
      id: true,
      type: true,
      key: true,
    },
  });

  const web3Credentials = credentials.find((credential) => credential.type.includes("_web3"));

  const eventType = {
    ...eventTypeRaw,
    metadata: (eventTypeRaw.metadata || {}) as JSONObject,
    recurringEvent: (eventTypeRaw.recurringEvent || {}) as RecurringEvent,
    isWeb3Active:
      web3Credentials && web3Credentials.key
        ? (((web3Credentials.key as JSONObject).isWeb3Active || false) as boolean)
        : false,
  };

  const eventTypeObject = [eventType].map((e) => {
    return {
      ...e,
      periodStartDate: e.periodStartDate?.toString() ?? null,
      periodEndDate: e.periodEndDate?.toString() ?? null,
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

  const t = await getTranslation(context.locale ?? "en", "common");

  // Checking if number of recurring event ocurrances is valid against event type configuration
  const recurringEventCount =
    (eventTypeObject?.recurringEvent?.count &&
      recurringEventCountQuery &&
      (parseInt(recurringEventCountQuery) <= eventTypeObject.recurringEvent.count
        ? recurringEventCountQuery
        : eventType.recurringEvent.count)) ||
    null;

  return {
    props: {
      locationLabels: getLocationLabels(t),
      profile,
      eventType: eventTypeObject,
      booking: null,
      trpcState: ssr.dehydrate(),
      recurringEventCount,
      isDynamicGroupBooking: false,
      hasHashedBookingLink: true,
      hashedLink: link,
    },
  };
}
