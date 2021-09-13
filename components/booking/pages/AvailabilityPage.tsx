// Get router variables
import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import { EventType } from "@prisma/client";
import dayjs, { Dayjs } from "dayjs";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";
import { ChevronDownIcon, ChevronUpIcon, ClockIcon, GlobeIcon } from "@heroicons/react/solid";
import Avatar from "@components/Avatar";
import DatePicker from "@components/booking/DatePicker";
import { isBrandingHidden } from "@lib/isBrandingHidden";
import PoweredByCalendso from "@components/ui/PoweredByCalendso";
import { timeZone } from "@lib/clock";
import AvailableTimes from "@components/booking/AvailableTimes";
import TimeOptions from "@components/booking/TimeOptions";
import * as Collapsible from "@radix-ui/react-collapsible";
import { HeadSeo } from "@components/seo/head-seo";
import { asStringOrNull } from "@lib/asStringOrNull";
import useTheme from "@lib/hooks/useTheme";

type AvailabilityPageProps = {
  eventType: EventType;
  profile: {
    name: string;
    image: string;
    theme?: string;
  };
  workingHours: [];
};

const AvailabilityPage = ({ profile, eventType, workingHours }: AvailabilityPageProps) => {
  const router = useRouter();
  const { rescheduleUid } = router.query;
  const themeLoaded = useTheme(profile.theme);

  const selectedDate = useMemo(() => {
    const date = dayjs(asStringOrNull(router.query.date));
    return date.isValid() ? date : null;
  }, [router.query.date]);

  const [isTimeOptionsOpen, setIsTimeOptionsOpen] = useState(false);
  const [timeFormat, setTimeFormat] = useState("h:mma");
  const telemetry = useTelemetry();

  useEffect(() => {
    handleToggle24hClock(localStorage.getItem("timeOption.is24hClock") === "true");
    telemetry.withJitsu((jitsu) => jitsu.track(telemetryEventTypes.pageView, collectPageParameters()));
  }, [telemetry]);

  const changeDate = (newDate: Dayjs) => {
    telemetry.withJitsu((jitsu) => jitsu.track(telemetryEventTypes.dateSelected, collectPageParameters()));
    router.replace(
      {
        query: {
          ...router.query,
          date: newDate.format("YYYY-MM-DD"),
        },
      },
      undefined,
      {
        shallow: true,
      }
    );
  };

  const handleSelectTimeZone = (selectedTimeZone: string): void => {
    if (selectedDate) {
      changeDate(selectedDate.tz(selectedTimeZone));
    }
    setIsTimeOptionsOpen(false);
  };

  const handleToggle24hClock = (is24hClock: boolean) => {
    setTimeFormat(is24hClock ? "HH:mm" : "h:mma");
  };

  return (
    themeLoaded && (
      <>
        <HeadSeo
          title={`${rescheduleUid ? "Reschedule" : ""} ${eventType.title} | ${profile.name}`}
          description={`${rescheduleUid ? "Reschedule" : ""} ${eventType.title}`}
          name={profile.name}
          avatar={profile.image}
        />
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
                  <ul className="h-9">
                    <li className="inline-block">
                      <Avatar imageSrc={profile.image} displayName={profile.name} size="9" />
                    </li>
                    {eventType.users
                      .filter((user) => user.name !== profile.name)
                      .map((user) => (
                        <li key={user.id} className="inline-block -ml-2">
                          <Avatar imageSrc={user.avatar} displayName={user.name} size="9" tooltip={true} />
                        </li>
                      ))}
                  </ul>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-black dark:text-gray-300">{profile.name}</p>
                    <div className="flex gap-2 text-xs font-medium text-gray-600">
                      {eventType.title}
                      <div>
                        <ClockIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                        {eventType.length} minutes
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-gray-600 dark:text-gray-200">{eventType.description}</p>
              </div>

              <div className="px-4 sm:flex sm:py-5 sm:p-4">
                <div
                  className={
                    "hidden md:block pr-8 sm:border-r sm:dark:border-gray-800 " +
                    (selectedDate ? "sm:w-1/3" : "sm:w-1/2")
                  }>
                  <ul className="flex flex-inline mb-2">
                    <li>
                      <Avatar imageSrc={profile.image} displayName={profile.name} size="16" />
                    </li>
                    {eventType.users
                      .filter((user) => user.name !== profile.name)
                      .map((user) => (
                        <li key={user.id} className="-ml-2">
                          <Avatar imageSrc={user.avatar} displayName={user.name} size="16" tooltip={true} />
                        </li>
                      ))}
                  </ul>
                  <h2 className="font-medium text-gray-500 dark:text-gray-300">{profile.name}</h2>
                  <h1 className="mb-4 text-3xl font-semibold text-gray-800 dark:text-white">
                    {eventType.title}
                  </h1>
                  <p className="px-2 py-1 mb-1 -ml-2 text-gray-500">
                    <ClockIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                    {eventType.length} minutes
                  </p>

                  <TimezoneDropdown />

                  <p className="mt-3 mb-8 text-gray-600 dark:text-gray-200">{eventType.description}</p>
                </div>
                <DatePicker
                  date={selectedDate}
                  periodType={eventType?.periodType}
                  periodStartDate={eventType?.periodStartDate}
                  periodEndDate={eventType?.periodEndDate}
                  periodDays={eventType?.periodDays}
                  periodCountCalendarDays={eventType?.periodCountCalendarDays}
                  onDatePicked={changeDate}
                  workingHours={[
                    {
                      days: [0, 1, 2, 3, 4, 5, 6],
                      endTime: 1440,
                      startTime: 0,
                    },
                  ]}
                  weekStart="Sunday"
                  eventLength={eventType.length}
                  minimumBookingNotice={eventType.minimumBookingNotice}
                />

                <div className="block mt-4 ml-1 sm:hidden">
                  <TimezoneDropdown />
                </div>

                {selectedDate && (
                  <AvailableTimes
                    workingHours={workingHours}
                    timeFormat={timeFormat}
                    minimumBookingNotice={eventType.minimumBookingNotice}
                    eventTypeId={eventType.id}
                    eventLength={eventType.length}
                    date={selectedDate}
                    users={eventType.users}
                    schedulingType={eventType.schedulingType ?? null}
                  />
                )}
              </div>
            </div>
            {eventType.users.length && isBrandingHidden(eventType.users[0]) && <PoweredByCalendso />}
          </main>
        </div>
      </>
    )
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
};

export default AvailabilityPage;
