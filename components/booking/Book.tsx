// Get router variables
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { EventType, SchedulingType } from "@prisma/client";
import dayjs, { Dayjs } from "dayjs";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";
import { ChevronDownIcon, ChevronUpIcon, ClockIcon, GlobeIcon } from "@heroicons/react/solid";
import Avatar from "@components/Avatar";
import DatePicker from "@components/booking/DatePicker";
import { timeZone } from "@lib/clock";
import AvailableTimes from "@components/booking/AvailableTimes";
import TimeOptions from "@components/booking/TimeOptions";
import { Profile } from "@lib/profile";
import * as Collapsible from "@radix-ui/react-collapsible";

type BookProps = {
  eventType: EventType;
  profile: Profile;
  schedulingType: SchedulingType;
  workingHours: [];
};

const Book = ({ profile, eventType, workingHours }: BookProps) => {
  const router = useRouter();
  const { date } = router.query;

  const [selectedDate, setSelectedDate] = useState<Dayjs>(() => {
    return typeof date === "string" && dayjs(date).isValid() ? dayjs(date) : null;
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
      {/*<HeadSeo
          title={`${rescheduleUid ? "Reschedule" : ""} ${props.eventType.title} | ${
            props.profile.name
          }`}
          description={`${rescheduleUid ? "Reschedule" : ""} ${props.eventType.title}`}
          name={props.profile.name}
          avatar={props.profile.image}
        />*/}
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
                    <Avatar
                      imageSrc={profile.image}
                      displayName={profile.name}
                      className="inline-block rounded-full h-16 w-16"
                    />
                  </li>
                  {eventType.organizers
                    .filter((organizer) => organizer.name !== profile.name)
                    .map((organizer) => (
                      <li key={organizer.id} className="-ml-2">
                        <Avatar
                          imageSrc={organizer.avatar}
                          displayName={organizer.name}
                          className="h-16 w-16"
                        />
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
                organizerTimeZone="Europe/London"
                weekStart="Sunday"
                inviteeTimeZone={timeZone()}
                eventLength={eventType.length}
                minimumBookingNotice={120}
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
                  organizers={eventType.organizers}
                  schedulingType={eventType.schedulingType ?? null}
                />
              )}
            </div>
          </div>
        </main>
      </div>
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
};

export default Book;
