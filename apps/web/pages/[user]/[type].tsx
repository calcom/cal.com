import { GetStaticPropsContext } from "next";

import { locationHiddenFilter, LocationObject } from "@calcom/app-store/locations";
import { getDefaultEvent, getGroupName, getUsernameList } from "@calcom/lib/defaultEvents";
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

async function getUserPageProps({ username, slug }: { username: string; slug: string }) {
  const user = await prisma.user.findUnique({
    where: {
      username,
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
          slug,
        },
        {
          userId: user?.id,
        },
      ],
    },
    select: {
      title: true,
      slug: true,
      recurringEvent: true,
      length: true,
      locations: true,
      id: true,
      description: true,
      price: true,
      currency: true,
      requiresConfirmation: true,
      metadata: true,
      seatsPerTimeSlot: true,
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
        slug: `${eventType.users[0].username}/${eventType.slug}`,
        image: `http://localhost:3000/${eventType.users[0].username}/avatar.png`,
      },
      away: user?.away,
    },
  };
}

async function getDynamicGroupPageProps({
  usernameList,
  length,
}: {
  usernameList: string[];
  length: number;
}) {
  const eventType = getDefaultEvent("" + length);

  const users = await prisma.user.findMany({
    where: {
      username: {
        in: usernameList,
      },
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
      plan: true,
    },
  });

  if (!users || !users.length) {
    return {
      notFound: true,
    };
  }

  eventType.users = users.map((user) => {
    return {
      image: `http://localhost:3000/${user.username}/avatar.png`,
      name: user.name as string,
      username: user.username as string,
      hideBranding: user.hideBranding,
      plan: user.plan,
      timeZone: user.timeZone as string,
    };
  });

  const dynamicNames = users.map((user) => {
    return user.name || "";
  });

  const profile = {
    name: getGroupName(dynamicNames),
    image: null,
    slug: "" + length,
    theme: null,
    weekStart: "Sunday",
    brandColor: "",
    darkBrandColor: "",
    allowDynamicBooking: !users.some((user) => {
      return !user.allowDynamicBooking;
    }),
  };

  return {
    props: {
      eventType,
      profile,
    },
  };
}

export const getStaticProps = async (context: GetStaticPropsContext) => {
  const typeParam = asStringOrThrow(context.params?.type);
  const userParam = asStringOrThrow(context.params?.user);

  // dynamic groups are not generated at build time, but otherwise are probably cached until infinity.
  const isDynamicGroup = userParam.includes("+");
  if (isDynamicGroup) {
    return await getDynamicGroupPageProps({
      usernameList: getUsernameList(userParam),
      length: parseInt(typeParam),
    });
  } else {
    return await getUserPageProps({ username: userParam, slug: typeParam });
  }
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
