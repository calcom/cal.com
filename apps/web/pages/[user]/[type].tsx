import { useLocale } from "@calcom/lib/hooks/useLocale";

import { inferSSRProps } from "@lib/types/inferSSRProps";

import AvailabilityPage from "@components/booking/pages/AvailabilityPage";

export type AvailabilityPageProps = inferSSRProps<typeof getStaticProps>;

export default function Type(props: AvailabilityPageProps) {
  const data = {
    ...props,
    isDynamicGroup: false,
    date: null,
    eventType: {
      id: 3,
      title: "30min",
      availability: [],
      description: "",
      length: 30,
      price: 0,
      currency: "usd",
      periodType: "UNLIMITED",
      periodStartDate: "Thu May 26 2022 15:23:21 GMT+0100 (British Summer Time)",
      periodEndDate: "Thu May 26 2022 15:23:21 GMT+0100 (British Summer Time)",
      periodDays: 30,
      periodCountCalendarDays: false,
      locations: [],
      schedulingType: null,
      recurringEvent: {},
      schedule: null,
      hidden: false,
      slug: "30min",
      minimumBookingNotice: 120,
      beforeEventBuffer: 0,
      afterEventBuffer: 0,
      timeZone: null,
      metadata: {},
      slotInterval: null,
      seatsPerTimeSlot: null,
      users: [{ ...props.profile }],
    },
    booking: null,
  };

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
  ) : data.isDynamicGroup && !data.profile.allowDynamicBooking ? (
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
    <AvailabilityPage {...data} />
  );
}

/*export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);

  const usernameList = getUsernameList(context.query.user);

  const userParam = asStringOrNull(context.query.user);
  const typeParam = asStringOrNull(context.query.type);
  const dateParam = asStringOrNull(context.query.date);
  const rescheduleUid = asStringOrNull(context.query.rescheduleUid);

  if (!userParam || !typeParam) {
    throw new Error(`File is not named [type]/[user]`);
  }

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
      eventTypes: {
        where: {
          AND: [
            {
              slug: typeParam,
            },
            {
              teamId: null,
            },
          ],
        },
        select: {
          ...availiblityPageEventTypeSelect,
          users: {
            select: {
              id: false,
              avatar: true,
              name: true,
              username: true,
              hideBranding: true,
              plan: true,
              timeZone: true,
            },
          },
        },
      },
    },
  });

  if (!users || !users.length) {
    return {
      notFound: true,
    };
  }
  const [user] = users; //to be used when dealing with single user, not dynamic group
  const isSingleUser = users.length === 1;
  const isDynamicGroup = users.length > 1;

  if (isSingleUser && user.eventTypes.length !== 1) {
    const eventTypeBackwardsCompat = await prisma.eventType.findFirst({
      where: {
        AND: [
          {
            userId: user.id,
          },
          {
            slug: typeParam,
          },
        ],
      },
      select: {
        ...availiblityPageEventTypeSelect,
        users: {
          select: {
            id: false,
            avatar: true,
            name: true,
            username: true,
            hideBranding: true,
            plan: true,
            timeZone: true,
          },
        },
      },
    });
    if (!eventTypeBackwardsCompat) {
      return {
        notFound: true,
      };
    }

    eventTypeBackwardsCompat.users.push({
      avatar: user.avatar,
      name: user.name,
      username: user.username,
      hideBranding: user.hideBranding,
      plan: user.plan,
      timeZone: user.timeZone,
    });

    user.eventTypes.push(eventTypeBackwardsCompat);
  }

  let [eventType] = user.eventTypes;

  if (isDynamicGroup) {
    eventType = getDefaultEvent(typeParam);
    eventType["users"] = users.map((user) => {
      return {
        avatar: user.avatar as string,
        name: user.name as string,
        username: user.username as string,
        hideBranding: user.hideBranding,
        plan: user.plan,
        timeZone: user.timeZone as string,
      };
    });
  }

  // check this is the first event for free user
  if (isSingleUser && user.plan === UserPlan.FREE) {
    const firstEventType = await prisma.eventType.findFirst({
      where: {
        OR: [
          {
            userId: user.id,
          },
          {
            users: {
              some: {
                id: user.id,
              },
            },
          },
        ],
      },
      orderBy: [
        {
          position: "desc",
        },
        {
          id: "asc",
        },
      ],
      select: {
        id: true,
      },
    });
    if (firstEventType?.id !== eventType.id) {
      return {
        notFound: true,
      } as const;
    }
  }
  const locations = eventType.locations ? (eventType.locations as LocationObject[]) : [];

  const eventTypeObject = Object.assign({}, eventType, {
    metadata: (eventType.metadata || {}) as JSONObject,
    periodStartDate: eventType.periodStartDate?.toString() ?? null,
    periodEndDate: eventType.periodEndDate?.toString() ?? null,
    recurringEvent: parseRecurringEvent(eventType.recurringEvent),
    locations: locationHiddenFilter(locations),
  });

  const schedule = eventType.schedule
    ? { ...eventType.schedule }
    : {
        ...user.schedules.filter(
          (schedule) => !user.defaultScheduleId || schedule.id === user.defaultScheduleId
        )[0],
      };

  const timeZone = isDynamicGroup ? undefined : schedule.timeZone || eventType.timeZone || user.timeZone;

  const workingHours = getWorkingHours(
    {
      timeZone,
    },
    isDynamicGroup
      ? eventType.availability || undefined
      : schedule.availability || (eventType.availability.length ? eventType.availability : user.availability)
  );
  eventTypeObject.schedule = null;
  eventTypeObject.availability = [];

  let booking: GetBookingType | null = null;
  if (rescheduleUid) {
    booking = await getBooking(prisma, rescheduleUid);
  }

  const dynamicNames = isDynamicGroup
    ? users.map((user) => {
        return user.name || "";
      })
    : [];

  const profile = isDynamicGroup
    ? {
        name: getGroupName(dynamicNames),
        image: null,
        slug: typeParam,
        theme: null,
        weekStart: "Sunday",
        brandColor: "",
        darkBrandColor: "",
        allowDynamicBooking: !users.some((user) => {
          return !user.allowDynamicBooking;
        }),
      }
    : {
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
      isDynamicGroup,
      profile,
      plan: user.plan,
      date: dateParam,
      eventType: eventTypeObject,
      workingHours,
      trpcState: ssr.dehydrate(),
      booking,
    },
  };
};*/

export const getStaticProps = async () => {
  return {
    props: {
      profile: {
        name: "Pro Example",
        username: "pro",
        hideBranding: false,
        plan: "PRO",
        timeZone: "Europe/London",
        image: "http://localhost:3000/pro/avatar.png",
      },
      away: false,
      eventTypeId: 1,
    },
  };
};

export const getStaticPaths = async () => {
  const paths = ["/pro/30min"];

  return { paths, fallback: "blocking" };
};
