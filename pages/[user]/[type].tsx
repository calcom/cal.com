/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import Avatar from "@components/Avatar";
import AvailableTimes from "@components/booking/AvailableTimes";
import DatePicker from "@components/booking/DatePicker";
import TimeOptions from "@components/booking/TimeOptions";
import { HeadSeo } from "@components/seo/head-seo";
import Theme from "@components/Theme";
import PoweredByCalendso from "@components/ui/PoweredByCalendso";
import { ChevronDownIcon, ChevronUpIcon, ClockIcon, GlobeIcon } from "@heroicons/react/solid";
import { asStringOrNull } from "@lib/asStringOrNull";
import { timeZone } from "@lib/clock";
import prisma from "@lib/prisma";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";
import { inferSSRProps } from "@lib/types/inferSSRProps";
import { Availability } from "@prisma/client";
import * as Collapsible from "@radix-ui/react-collapsible";
import dayjs, { Dayjs } from "dayjs";
import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function Type(props: inferSSRProps<typeof getServerSideProps>) {
  // Get router variables
  const router = useRouter();
  const { rescheduleUid } = router.query;

  const { isReady } = Theme(props.user.theme);

  const [selectedDate, setSelectedDate] = useState<Dayjs>(() => {
    return props.date && dayjs(props.date).isValid() ? dayjs(props.date) : null;
  });
  const [isTimeOptionsOpen, setIsTimeOptionsOpen] = useState(false);
  const [timeFormat, setTimeFormat] = useState("h:mma");
  const telemetry = useTelemetry();

  useEffect(() => {
    handleToggle24hClock(localStorage.getItem("timeOption.is24hClock") === "true");
    telemetry.withJitsu((jitsu) => jitsu.track(telemetryEventTypes.pageView, collectPageParameters()));
  }, [telemetry]);

  const changeDate = (date: Dayjs) => {
    telemetry.withJitsu((jitsu) => jitsu.track(telemetryEventTypes.dateSelected, collectPageParameters()));
    setSelectedDate(date);
  };

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    const formattedDate = selectedDate.utc().format("YYYY-MM-DD");

    router.replace(
      {
        query: Object.assign(
          {},
          {
            ...router.query,
          },
          {
            date: formattedDate,
          }
        ),
      },
      undefined,
      {
        shallow: true,
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const handleSelectTimeZone = (selectedTimeZone: string): void => {
    if (selectedDate) {
      setSelectedDate(selectedDate.tz(selectedTimeZone));
    }
    setIsTimeOptionsOpen(false);
  };

  const handleToggle24hClock = (is24hClock: boolean) => {
    setTimeFormat(is24hClock ? "HH:mm" : "h:mma");
  };

  return (
    <>
      <HeadSeo
        title={`${rescheduleUid ? "Reschedule" : ""} ${props.eventType.title} | ${
          props.user.name || props.user.username
        }`}
        description={`${rescheduleUid ? "Reschedule" : ""} ${props.eventType.title}`}
        name={props.user.name || props.user.username}
        avatar={props.user.avatar}
      />
      {isReady && (
        <div>
          <main
            className={
              "mx-auto my-0 md:my-24 transition-max-width ease-in-out duration-500 " +
              (selectedDate ? "max-w-5xl" : "max-w-3xl")
            }>
            <div className="bg-white border-gray-200 rounded-sm sm:dark:border-gray-600 dark:bg-gray-900 md:border">
              {/* mobile: details */}
              <div className="block p-4 sm:p-8 md:hidden">
                <div className="flex items-center">
                  <Avatar
                    imageSrc={props.user.avatar}
                    displayName={props.user.name}
                    className="inline-block rounded-full h-9 w-9"
                  />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-black dark:text-gray-300">{props.user.name}</p>
                    <div className="flex gap-2 text-xs font-medium text-gray-600">
                      {props.eventType.title}
                      <div>
                        <ClockIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                        {props.eventType.length} minutes
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-gray-600 dark:text-gray-200">{props.eventType.description}</p>
              </div>

              <div className="px-4 sm:flex sm:py-5 sm:p-4">
                <div
                  className={
                    "hidden md:block pr-8 sm:border-r sm:dark:border-gray-800 " +
                    (selectedDate ? "sm:w-1/3" : "sm:w-1/2")
                  }>
                  <Avatar
                    imageSrc={props.user.avatar}
                    displayName={props.user.name}
                    className="w-16 h-16 mb-4 rounded-full"
                  />
                  <h2 className="font-medium text-gray-500 dark:text-gray-300">{props.user.name}</h2>
                  <h1 className="mb-4 text-3xl font-semibold text-gray-800 dark:text-white">
                    {props.eventType.title}
                  </h1>
                  <p className="px-2 py-1 mb-1 -ml-2 text-gray-500">
                    <ClockIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                    {props.eventType.length} minutes
                  </p>

                  <TimezoneDropdown />

                  <p className="mt-3 mb-8 text-gray-600 dark:text-gray-200">{props.eventType.description}</p>
                </div>
                <DatePicker
                  date={selectedDate}
                  periodType={props.eventType?.periodType}
                  periodStartDate={props.eventType?.periodStartDate}
                  periodEndDate={props.eventType?.periodEndDate}
                  periodDays={props.eventType?.periodDays}
                  periodCountCalendarDays={props.eventType?.periodCountCalendarDays}
                  weekStart={props.user.weekStart}
                  onDatePicked={changeDate}
                  workingHours={props.workingHours}
                  organizerTimeZone={props.eventType.timeZone || props.user.timeZone}
                  inviteeTimeZone={timeZone()}
                  eventLength={props.eventType.length}
                  minimumBookingNotice={props.eventType.minimumBookingNotice}
                />

                <div className="block mt-4 ml-1 sm:hidden">
                  <TimezoneDropdown />
                </div>

                {selectedDate && (
                  <AvailableTimes
                    workingHours={props.workingHours}
                    timeFormat={timeFormat}
                    organizerTimeZone={props.eventType.timeZone || props.user.timeZone}
                    minimumBookingNotice={props.eventType.minimumBookingNotice}
                    eventTypeId={props.eventType.id}
                    eventLength={props.eventType.length}
                    date={selectedDate}
                    user={props.user}
                  />
                )}
              </div>
            </div>
            {!props.user.hideBranding && <PoweredByCalendso />}
          </main>
        </div>
      )}
    </>
  );

  function TimezoneDropdown() {
    return (
      <Collapsible.Root open={isTimeOptionsOpen} onOpenChange={setIsTimeOptionsOpen}>
        <Collapsible.Trigger className="px-2 py-1 mb-1 -ml-2 text-left text-gray-500 min-w-32">
          <GlobeIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
          {timeZone()}
          {isTimeOptionsOpen ? (
            <ChevronUpIcon className="inline-block w-4 h-4 ml-1 -mt-1" />
          ) : (
            <ChevronDownIcon className="inline-block w-4 h-4 ml-1 -mt-1" />
          )}
        </Collapsible.Trigger>
        <Collapsible.Content>
          <TimeOptions onSelectTimeZone={handleSelectTimeZone} onToggle24hClock={handleToggle24hClock} />
        </Collapsible.Content>
      </Collapsible.Root>
    );
  }
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  // get query params and typecast them to string
  // (would be even better to assert them instead of typecasting)
  const userParam = asStringOrNull(context.query.user);
  const typeParam = asStringOrNull(context.query.type);
  const dateParam = asStringOrNull(context.query.date);

  if (!userParam || !typeParam) {
    throw new Error(`File is not named [type]/[user]`);
  }

  const user = await prisma.user.findFirst({
    where: {
      username: userParam.toLowerCase(),
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
      theme: true,
      plan: true,
    },
  });

  if (!user) {
    return {
      notFound: true,
    } as const;
  }
  const eventType = await prisma.eventType.findUnique({
    where: {
      userId_slug: {
        userId: user.id,
        slug: typeParam,
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      length: true,
      availability: true,
      timeZone: true,
      periodType: true,
      periodDays: true,
      periodStartDate: true,
      periodEndDate: true,
      periodCountCalendarDays: true,
      minimumBookingNotice: true,
      hidden: true,
    },
  });

  if (!eventType || eventType.hidden) {
    return {
      notFound: true,
    } as const;
  }

  // check this is the first event
  if (user.plan === "FREE") {
    const firstEventType = await prisma.eventType.findFirst({
      where: {
        userId: user.id,
      },
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
  const getWorkingHours = (providesAvailability: { availability: Availability[] }) =>
    providesAvailability.availability && providesAvailability.availability.length
      ? providesAvailability.availability
      : null;

  const workingHours =
    getWorkingHours(eventType) ||
    getWorkingHours(user) ||
    [
      {
        days: [0, 1, 2, 3, 4, 5, 6],
        startTime: user.startTime,
        endTime: user.endTime,
      },
    ].filter((availability): boolean => typeof availability["days"] !== "undefined");

  workingHours.sort((a, b) => a.startTime - b.startTime);

  const eventTypeObject = Object.assign({}, eventType, {
    periodStartDate: eventType.periodStartDate?.toString() ?? null,
    periodEndDate: eventType.periodEndDate?.toString() ?? null,
  });

  return {
    props: {
      user,
      date: dateParam,
      eventType: eventTypeObject,
      workingHours,
    },
  };
};
