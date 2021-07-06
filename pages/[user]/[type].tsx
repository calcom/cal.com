import { useEffect, useState } from "react";
import { GetServerSideProps } from "next";
import Head from "next/head";
import { ClockIcon, GlobeIcon, ChevronDownIcon } from "@heroicons/react/solid";
import prisma from "../../lib/prisma";
import { useRouter } from "next/router";
import { Dayjs } from "dayjs";

import { collectPageParameters, telemetryEventTypes, useTelemetry } from "../../lib/telemetry";
import AvailableTimes from "../../components/booking/AvailableTimes";
import TimeOptions from "../../components/booking/TimeOptions";
import Avatar from "../../components/Avatar";
import { timeZone } from "../../lib/clock";
import DatePicker from "../../components/booking/DatePicker";
import PoweredByCalendso from "../../components/ui/PoweredByCalendso";
import { assertString } from "../../core/assertions";

export default function Type(props): Type {
  // Get router variables
  const router = useRouter();
  const { rescheduleUid } = router.query;

  const [selectedDate, setSelectedDate] = useState<Dayjs>();
  const [isTimeOptionsOpen, setIsTimeOptionsOpen] = useState(false);
  const [timeFormat, setTimeFormat] = useState("h:mma");
  const telemetry = useTelemetry();

  useEffect(() => {
    telemetry.withJitsu((jitsu) => jitsu.track(telemetryEventTypes.pageView, collectPageParameters()));
  }, [telemetry]);

  const changeDate = (date: Dayjs) => {
    telemetry.withJitsu((jitsu) => jitsu.track(telemetryEventTypes.dateSelected, collectPageParameters()));
    setSelectedDate(date);
  };

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
    <div>
      <Head>
        <title>
          {rescheduleUid && "Reschedule"} {props.fetchedEventType.title} |{" "}
          {props.fetchedUser.name || props.fetchedUser.username} | Calendso
        </title>
        <meta
          name="title"
          content={"Meet " + (props.fetchedUser.name || props.fetchedUser.username) + " via Calendso"}
        />
        <meta name="description" content={props.fetchedEventType.description} />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://calendso/" />
        <meta
          property="og:title"
          content={"Meet " + (props.fetchedUser.name || props.fetchedUser.username) + " via Calendso"}
        />
        <meta property="og:description" content={props.fetchedEventType.description} />
        <meta
          property="og:image"
          content={
            "https://og-image-one-pi.vercel.app/" +
            encodeURIComponent(
              "Meet **" +
                (props.fetchedUser.name || props.fetchedUser.username) +
                "** <br>" +
                props.fetchedEventType.description
            ).replace(/'/g, "%27") +
            ".png?md=1&images=https%3A%2F%2Fcalendso.com%2Fcalendso-logo-white.svg&images=" +
            encodeURIComponent(props.fetchedUser.avatar)
          }
        />

        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://calendso/" />
        <meta
          property="twitter:title"
          content={"Meet " + (props.fetchedUser.name || props.fetchedUser.username) + " via Calendso"}
        />
        <meta property="twitter:description" content={props.fetchedEventType.description} />
        <meta
          property="twitter:image"
          content={
            "https://og-image-one-pi.vercel.app/" +
            encodeURIComponent(
              "Meet **" +
                (props.fetchedUser.name || props.fetchedUser.username) +
                "** <br>" +
                props.fetchedEventType.description
            ).replace(/'/g, "%27") +
            ".png?md=1&images=https%3A%2F%2Fcalendso.com%2Fcalendso-logo-white.svg&images=" +
            encodeURIComponent(props.fetchedUser.avatar)
          }
        />
      </Head>
      <main
        className={
          "mx-auto my-0 sm:my-24 transition-max-width ease-in-out duration-500 " +
          (selectedDate ? "max-w-6xl" : "max-w-3xl")
        }>
        <div className="bg-white sm:shadow sm:rounded-lg">
          <div className="sm:flex px-4 py-5 sm:p-4">
            <div className={"pr-8 sm:border-r " + (selectedDate ? "sm:w-1/3" : "sm:w-1/2")}>
              <Avatar user={props.fetchedUser} className="w-16 h-16 rounded-full mb-4" />
              <h2 className="font-medium text-gray-500">{props.fetchedUser.name}</h2>
              <h1 className="text-3xl font-semibold text-gray-800 mb-4">{props.fetchedEventType.title}</h1>
              <p className="text-gray-500 mb-1 px-2 py-1 -ml-2">
                <ClockIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                {props.fetchedEventType.length} minutes
              </p>
              <button
                onClick={() => setIsTimeOptionsOpen(!isTimeOptionsOpen)}
                className="text-gray-500 mb-1 px-2 py-1 -ml-2">
                <GlobeIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                {timeZone()}
                <ChevronDownIcon className="inline-block w-4 h-4 ml-1 -mt-1" />
              </button>
              {isTimeOptionsOpen && (
                <TimeOptions
                  onSelectTimeZone={handleSelectTimeZone}
                  onToggle24hClock={handleToggle24hClock}
                />
              )}
              <p className="text-gray-600 mt-3 mb-8">{props.fetchedEventType.description}</p>
            </div>
            <DatePicker
              weekStart={props.fetchedUser.weekStart}
              onDatePicked={changeDate}
              workingHours={props.workingHours}
              organizerTimeZone={props.fetchedEventType.timeZone || props.fetchedUser.timeZone}
              inviteeTimeZone={timeZone()}
              eventLength={props.fetchedEventType.length}
            />
            {selectedDate && (
              <AvailableTimes
                workingHours={props.workingHours}
                timeFormat={timeFormat}
                eventLength={props.fetchedEventType.length}
                eventTypeId={props.fetchedEventType.id}
                date={selectedDate}
                user={props.fetchedUser}
              />
            )}
          </div>
        </div>
        {!props.fetchedUser.hideBranding && <PoweredByCalendso />}
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { user, type } = context.query;

  try {
    assertString(user);
    assertString(type);
  } catch (e) {
    throw new Error("Invalid [user] or [type] parameter(s)");
  }

  const fetchedUser = await prisma.user.findFirst({
    where: {
      username: user,
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      bio: true,
      avatar: true,
      eventTypes: true,
      startTime: true,
      timeZone: true,
      endTime: true,
      weekStart: true,
      availability: true,
      hideBranding: true,
    },
  });

  if (!fetchedUser) {
    return {
      notFound: true,
    };
  }

  const fetchedEventType = await prisma.eventType.findFirst({
    where: {
      userId: fetchedUser.id,
      slug: {
        equals: type,
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      length: true,
      availability: true,
      timeZone: true,
    },
  });

  if (!fetchedEventType) {
    return {
      notFound: true,
    };
  }

  const getWorkingHours = (providesAvailability) =>
    providesAvailability.availability && providesAvailability.availability.length
      ? providesAvailability.availability
      : null;

  const workingHours: [] =
    getWorkingHours(fetchedEventType) ||
    getWorkingHours(fetchedUser) ||
    [
      {
        days: [0, 1, 2, 3, 4, 5, 6],
        startTime: fetchedUser.startTime,
        endTime: fetchedUser.endTime,
      },
    ].filter((availability): boolean => typeof availability["days"] !== "undefined");

  workingHours.sort((a, b) => a.startTime - b.startTime);

  return {
    props: {
      fetchedUser,
      fetchedEventType,
      workingHours,
    },
  };
};
