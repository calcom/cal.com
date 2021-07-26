import { useEffect, useState } from "react";
import { GetServerSideProps, GetServerSidePropsContext } from "next";
import Head from "next/head";
import { ChevronDownIcon, ClockIcon, GlobeIcon } from "@heroicons/react/solid";
import { useRouter } from "next/router";
import dayjs, { Dayjs } from "dayjs";

import prisma, { whereAndSelect } from "@lib/prisma";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "../../lib/telemetry";
import AvailableTimes from "../../components/booking/AvailableTimes";
import TimeOptions from "../../components/booking/TimeOptions";
import Avatar from "../../components/Avatar";
import { timeZone } from "../../lib/clock";
import DatePicker from "../../components/booking/DatePicker";
import PoweredByCalendso from "../../components/ui/PoweredByCalendso";
import Theme from "@components/Theme";

export default function Type(props): Type {
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
        query: {
          date: formattedDate,
        },
      },
      undefined,
      {
        shallow: true,
      }
    );
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
    isReady && (
      <div>
        <Head>
          <title>
            {rescheduleUid && "Reschedule"} {props.eventType.title} | {props.user.name || props.user.username}{" "}
            | Calendso
          </title>
          <meta name="title" content={"Meet " + (props.user.name || props.user.username) + " via Calendso"} />
          <meta name="description" content={props.eventType.description} />

          <meta property="og:type" content="website" />
          <meta property="og:url" content="https://calendso/" />
          <meta
            property="og:title"
            content={"Meet " + (props.user.name || props.user.username) + " via Calendso"}
          />
          <meta property="og:description" content={props.eventType.description} />
          <meta
            property="og:image"
            content={
              "https://og-image-one-pi.vercel.app/" +
              encodeURIComponent(
                "Meet **" + (props.user.name || props.user.username) + "** <br>" + props.eventType.description
              ).replace(/'/g, "%27") +
              ".png?md=1&images=https%3A%2F%2Fcalendso.com%2Fcalendso-logo-white.svg&images=" +
              encodeURIComponent(props.user.avatar)
            }
          />

          <meta property="twitter:card" content="summary_large_image" />
          <meta property="twitter:url" content="https://calendso/" />
          <meta
            property="twitter:title"
            content={"Meet " + (props.user.name || props.user.username) + " via Calendso"}
          />
          <meta property="twitter:description" content={props.eventType.description} />
          <meta
            property="twitter:image"
            content={
              "https://og-image-one-pi.vercel.app/" +
              encodeURIComponent(
                "Meet **" + (props.user.name || props.user.username) + "** <br>" + props.eventType.description
              ).replace(/'/g, "%27") +
              ".png?md=1&images=https%3A%2F%2Fcalendso.com%2Fcalendso-logo-white.svg&images=" +
              encodeURIComponent(props.user.avatar)
            }
          />
        </Head>
        <main
          className={
            "mx-auto my-0 sm:my-24 transition-max-width ease-in-out duration-500 " +
            (selectedDate ? "max-w-6xl" : "max-w-3xl")
          }>
          <div className="dark:bg-gray-800 bg-white sm:shadow sm:rounded-lg">
            <div className="sm:flex px-4 py-5 sm:p-4">
              <div
                className={
                  "pr-8 sm:border-r sm:dark:border-gray-900 " + (selectedDate ? "sm:w-1/3" : "sm:w-1/2")
                }>
                <Avatar user={props.user} className="w-16 h-16 rounded-full mb-4" />
                <h2 className="font-medium dark:text-gray-300 text-gray-500">{props.user.name}</h2>
                <h1 className="text-3xl font-semibold dark:text-white text-gray-800 mb-4">
                  {props.eventType.title}
                </h1>
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
                <p className="dark:text-gray-200 text-gray-600 mt-3 mb-8">{props.eventType.description}</p>
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
    )
  );
}

export const getServerSideProps: GetServerSideProps = async (context: GetServerSidePropsContext) => {
  const dateQuery = context.query?.date ?? null;
  const date = Array.isArray(dateQuery) && dateQuery.length > 0 ? dateQuery.pop() : dateQuery;

  const user = await whereAndSelect(
    prisma.user.findFirst,
    {
      username: context.query.user.toLowerCase(),
    },
    [
      "id",
      "username",
      "name",
      "email",
      "bio",
      "avatar",
      "startTime",
      "endTime",
      "timeZone",
      "weekStart",
      "availability",
      "hideBranding",
      "theme",
    ]
  );

  if (!user) {
    return {
      notFound: true,
    };
  }

  const eventType = await whereAndSelect(
    prisma.eventType.findFirst,
    {
      userId: user.id,
      slug: context.query.type,
    },
    [
      "id",
      "title",
      "description",
      "length",
      "availability",
      "timeZone",
      "periodType",
      "periodDays",
      "periodStartDate",
      "periodEndDate",
      "periodCountCalendarDays",
      "minimumBookingNotice",
    ]
  );

  if (!eventType) {
    return {
      notFound: true,
    };
  }

  const getWorkingHours = (providesAvailability) =>
    providesAvailability.availability && providesAvailability.availability.length
      ? providesAvailability.availability
      : null;

  const workingHours: [] =
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
      date,
      eventType: eventTypeObject,
      workingHours,
    },
  };
};
