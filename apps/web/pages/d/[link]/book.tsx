import { GetServerSidePropsContext } from "next";
import { JSONObject } from "superjson/dist/types";

import { getLocationLabels } from "@calcom/app-store/utils";
import { parseRecurringEvent } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { bookEventTypeSelect } from "@calcom/prisma/selects";

import { asStringOrNull, asStringOrThrow } from "@lib/asStringOrNull";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import BookingPage from "@components/booking/pages/BookingPage";

import { ssrInit } from "@server/lib/ssr";

export type HashLinkPageProps = inferSSRProps<typeof getServerSideProps>;

export default function Book(props: HashLinkPageProps) {
  const { t } = useLocale();
  const locationLabels = getLocationLabels(t);

  return <BookingPage {...props} locationLabels={locationLabels} />;
}

Book.isThemeSupported = true;

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
    recurringEvent: parseRecurringEvent(eventTypeRaw.recurringEvent),
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
