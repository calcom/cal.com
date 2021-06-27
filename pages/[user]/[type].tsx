import { useEffect, useState, useMemo } from "react";
import { GetServerSideProps } from "next";
import Head from "next/head";
import { ClockIcon, GlobeIcon, ChevronDownIcon } from "@heroicons/react/solid";
import prisma from "../../lib/prisma";
import { useRouter } from "next/router";
import dayjs, { Dayjs } from "dayjs";

import { collectPageParameters, telemetryEventTypes, useTelemetry } from "../../lib/telemetry";
import AvailableTimes from "../../components/booking/AvailableTimes";
import TimeOptions from "../../components/booking/TimeOptions";
import Avatar from "../../components/Avatar";
import { timeZone } from "../../lib/clock";
import DatePicker from "../../components/booking/DatePicker";
import PoweredByCalendso from "../../components/ui/PoweredByCalendso";
import getSlots from "@lib/slots";

export default function Type(props): Type {
  // Get router variables
  const router = useRouter();
  const { rescheduleUid } = router.query;

  const [selectedDate, setSelectedDate] = useState<Dayjs>();
  const [isTimeOptionsOpen, setIsTimeOptionsOpen] = useState(false);
  const [timeFormat, setTimeFormat] = useState("h:mma");
  const telemetry = useTelemetry();

  const today: string = dayjs().utc().format("YYYY-MM-DDTHH:mm");
  const noSlotsToday = useMemo(
    () =>
      getSlots({
        frequency: props.eventType.length,
        inviteeDate: dayjs.utc(today) as Dayjs,
        workingHours: props.workingHours,
        minimumBookingNotice: 0,
      }).length === 0,
    [today, props.eventType.length, props.workingHours]
  );

  useEffect(() => {
    telemetry.withJitsu((jitsu) => jitsu.track(telemetryEventTypes.pageView, collectPageParameters()));
  }, [telemetry]);

  const changeDate = (date: Dayjs) => {
    telemetry.withJitsu((jitsu) => jitsu.track(telemetryEventTypes.dateSelected, collectPageParameters()));
    setSelectedDate(date.tz(timeZone()));
  };

  const handleSelectTimeZone = (selectedTimeZone: string): void => {
    if (selectedDate) {
      setSelectedDate(selectedDate.tz(selectedTimeZone));
    }
  };

  const handleToggle24hClock = (is24hClock: boolean) => {
    setTimeFormat(is24hClock ? "HH:mm" : "h:mma");
  };

  return (
    <div>
      <Head>
        <title>
          {rescheduleUid && "Reschedule"} {props.eventType.title} | {props.user.name || props.user.username} |
          Calendso
        </title>
        <meta name="title" content={"Meet " + (props.user.name || props.user.username)  + " via Calendso"} />
        <meta name="description" content={props.eventType.description} />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://calendso/" />
        <meta property="og:title" content={"Meet " + (props.user.name || props.user.username)  + " via Calendso"}/>
        <meta property="og:description" content={props.eventType.description}/>
        <meta property="og:image" content={"https://og-image-one-pi.vercel.app/" + encodeURIComponent("Meet **" + (props.user.name || props.user.username) + "** <br>" + props.eventType.description).replace(/'/g, "%27") + ".png?md=1&images=https%3A%2F%2Fcalendso.com%2Fcalendso-logo-white.svg&images=" + encodeURIComponent(props.user.avatar)} />

        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://calendso/" />
        <meta property="twitter:title" content={"Meet " + (props.user.name || props.user.username)  + " via Calendso"} />
        <meta property="twitter:description" content={props.eventType.description} />
        <meta property="twitter:image" content={"https://og-image-one-pi.vercel.app/" + encodeURIComponent("Meet **" + (props.user.name || props.user.username) + "** <br>" + props.eventType.description).replace(/'/g, "%27") + ".png?md=1&images=https%3A%2F%2Fcalendso.com%2Fcalendso-logo-white.svg&images=" + encodeURIComponent(props.user.avatar)} />

      </Head>
      <main
        className={
          "mx-auto my-24 transition-max-width ease-in-out duration-500 " +
          (selectedDate ? "max-w-6xl" : "max-w-3xl")
        }>
        <div className="bg-white shadow rounded-lg">
          <div className="sm:flex px-4 py-5 sm:p-4">
            <div className={"pr-8 sm:border-r " + (selectedDate ? "sm:w-1/3" : "sm:w-1/2")}>
              <Avatar user={props.user} className="w-16 h-16 rounded-full mb-4" />
              <h2 className="font-medium text-gray-500">{props.user.name}</h2>
              <h1 className="text-3xl font-semibold text-gray-800 mb-4">{props.eventType.title}</h1>
              <p className="text-gray-500 mb-1 px-2 py-1 -ml-2">
                <ClockIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                {props.eventType.length} minutes
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
              <p className="text-gray-600 mt-3 mb-8">{props.eventType.description}</p>
            </div>
            <DatePicker
              disableToday={noSlotsToday}
              weekStart={props.user.weekStart}
              onDatePicked={changeDate}
              workingHours={props.workingHours}
            />
            {selectedDate && (
              <AvailableTimes
                workingHours={props.workingHours}
                timeFormat={timeFormat}
                eventLength={props.eventType.length}
                eventTypeId={props.eventType.id}
                date={selectedDate}
              />
            )}
          </div>
        </div>
        {/* note(peer):
          you can remove calendso branding here, but we'd also appreciate it, if you don't <3
        */}
        <PoweredByCalendso />
      </main>
    </div>
  );
}

interface WorkingHours {
  days: number[];
  startTime: number;
  length: number;
}

type Availability = WorkingHours;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const user = await prisma.user.findFirst({
    where: {
      username: context.query.user.toLowerCase(),
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
    },
  });

  if (!user) {
    return {
      notFound: true,
    };
  }

  const eventType = await prisma.eventType.findFirst({
    where: {
      userId: user.id,
      slug: {
        equals: context.query.type,
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      length: true,
      availability: true,
    },
  });

  if (!eventType) {
    return {
      notFound: true,
    };
  }

  const getWorkingHours = (providesAvailability) =>
    providesAvailability.availability && providesAvailability.availability.length
      ? providesAvailability.availability
      : null;

  const workingHours: WorkingHours[] =
    getWorkingHours(eventType) ||
    getWorkingHours(user) ||
    [
      {
        days: [0, 1, 2, 3, 4, 5, 6],
        startTime: user.startTime,
        length: user.endTime,
      },
    ].filter((availability: Availability): boolean => typeof availability["days"] !== "undefined");

  return {
    props: {
      user,
      eventType,
      workingHours,
    },
  };
};
