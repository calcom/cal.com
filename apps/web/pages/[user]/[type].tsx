import { GetStaticPropsContext } from "next";

import { locationHiddenFilter, LocationObject } from "@calcom/app-store/locations";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";

import { asStringOrThrow } from "@lib/asStringOrNull";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import AvailabilityPage from "@components/booking/pages/AvailabilityPage";

export type AvailabilityPageProps = inferSSRProps<typeof getStaticProps>;

export default function Type(props: AvailabilityPageProps) {
  const { t } = useLocale();

  return props.away ? (
    <div className="h-screen dark:bg-neutral-900">
      <main className="mx-auto max-w-3xl px-4 py-24">
        <div className="space-y-6" data-testid="event-types">
          <div className="overflow-hidden rounded-sm border dark:border-gray-900">
            <div className="p-8 text-center text-gray-400 dark:text-white">
              <h2 className="font-cal mb-2 text-3xl text-gray-600 dark:text-white">
                😴{" " + t("user_away")}
              </h2>
              <p className="mx-auto max-w-md">{t("user_away_description")}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  ) : props.isDynamicGroup && !props.profile.allowDynamicBooking ? (
    <div className="h-screen dark:bg-neutral-900">
      <main className="mx-auto max-w-3xl px-4 py-24">
        <div className="space-y-6" data-testid="event-types">
          <div className="overflow-hidden rounded-sm border dark:border-gray-900">
            <div className="p-8 text-center text-gray-400 dark:text-white">
              <h2 className="font-cal mb-2 text-3xl text-gray-600 dark:text-white">
                {" " + t("unavailable")}
              </h2>
              <p className="mx-auto max-w-md">{t("user_dynamic_booking_disabled")}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  ) : (
    <AvailabilityPage {...props} />
  );
}

export const getStaticProps = async (context: GetStaticPropsContext) => {
  const typeParam = asStringOrThrow(context.params?.type);
  const userParam = asStringOrThrow(context.params?.user);

  const user = await prisma.user.findUnique({
    where: {
      username: userParam,
    },
    select: {
      id: true,
      away: true,
    },
  });

  if (!user) {
    return {
      notFound: true,
    };
  }

  const eventType = await prisma.eventType.findFirst({
    where: {
      AND: [
        {
          slug: typeParam,
        },
        {
          userId: user?.id,
        },
      ],
    },
    select: {
      title: true,
      recurringEvent: true,
      length: true,
      locations: true,
      id: true,
      description: true,
      price: true,
      currency: true,
      requiresConfirmation: true,
      metadata: true,
      users: {
        select: {
          name: true,
          username: true,
          hideBranding: true,
          plan: true,
        },
      },
    },
  });

  if (!eventType) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      eventType: {
        ...eventType,
        metadata: eventType.metadata || {},
        recurringEvent: parseRecurringEvent(eventType.recurringEvent),
        locations: locationHiddenFilter((eventType.locations || []) as LocationObject[]),
      },
      profile: {
        ...eventType.users[0],
        image: `http://localhost:3000/${eventType.users[0].username}/avatar.png`,
      },
      away: user?.away,
    },
  };
};

export const getStaticPaths = async () => {
  const users = await prisma.user.findMany({
    select: {
      username: true,
      eventTypes: {
        where: {
          teamId: null,
        },
        select: {
          slug: true,
        },
      },
    },
  });

  const paths = users?.flatMap((user) =>
    user.eventTypes.flatMap((eventType) => `/${user.username}/${eventType.slug}`)
  );

  return { paths, fallback: "blocking" };
};
