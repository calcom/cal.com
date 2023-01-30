import { BookerProps } from "booker/types";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";

import dayjs, { Dayjs } from "@calcom/dayjs";
import {
  EventTitle,
  EventMetaSkeleton,
  EventDetails,
  EventMembers,
  AvailableTimes,
  EventMeta,
  BookEventForm,
} from "@calcom/features/bookings";
import DatePicker from "@calcom/features/calendars/DatePicker";
import { useScheduleWithCache, useSlotsForDate, useNonEmptyScheduleDays } from "@calcom/features/schedules";
import CustomBranding from "@calcom/lib/CustomBranding";
import { trpc } from "@calcom/trpc/react";
import { TimezoneSelect } from "@calcom/ui";
import { FiChevronDown, FiGlobe } from "@calcom/ui/components/icon";

import { fadeInUp, fadeInLeft } from "./config";
import { useGetBrowsingMonthStart } from "./utils/dates";
import { useTimePrerences } from "./utils/time";

enum BookerState {
  LOADING = "loading",
  SELECTING_DATE = "selecting_date",
  SELECTING_TIME = "selecting_time",
  BOOKING = "booking",
}

// Why any? :( -> https://www.framer.com/motion/component/#%23%23animating-css-variables)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MotionStyleWithCssVar = any;

const BookerAtom = ({ username, eventSlug, month }: BookerProps) => {
  const { timezone, setTimezone } = useTimePrerences();
  const [browsingMonthStart, setBrowsingMonthStart] = useGetBrowsingMonthStart(month);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const schedule = useScheduleWithCache({ username, eventSlug, browsingMonth: browsingMonthStart, timezone });
  const slots = useSlotsForDate(selectedDate, schedule);
  const nonEmptyScheduleDays = useNonEmptyScheduleDays(schedule);
  const event = trpc.viewer.public.event.useQuery({ username, eventSlug }, { refetchOnWindowFocus: false });
  const [bookingTime, setBookingTime] = useState<string | null>(null);

  const onMonthChange = (date: Dayjs) => {
    setBrowsingMonthStart(date);
    setSelectedDate(null);
  };

  const onDaySelect = (date: Dayjs) => {
    setSelectedDate(date.format("YYYY-MM-DD"));
  };

  const onTimeSelect = (time: string) => {
    console.log(time);
    setBookingTime(time);
  };

  const status = useMemo(() => {
    if (event.isFetching) return BookerState.LOADING;
    if (slots.length === 0) return BookerState.SELECTING_DATE;
    if (!bookingTime) return BookerState.SELECTING_TIME;
    return BookerState.BOOKING;
  }, [event, slots, bookingTime]);

  return (
    <>
      {/* @TODO: This is imported because the DatePicker relies on it. Perhaps
      rewrite the datepicker as well? */}
      <CustomBranding />
      <m.div
        layout
        style={{ "--booker-max-width": "700px", "--booker-max-height": "412px" } as MotionStyleWithCssVar}
        variants={{
          [BookerState.LOADING]: {
            "--booker-max-width": "700px",
            "--booker-max-height": "412px",
          } as MotionStyleWithCssVar,
          [BookerState.SELECTING_DATE]: {
            "--booker-max-width": "700px",
            "--booker-max-height": "2000px",
          } as MotionStyleWithCssVar,
          [BookerState.SELECTING_TIME]: {
            "--booker-max-width": "2000px",
            "--booker-max-height": "2000px",
          } as MotionStyleWithCssVar,
          [BookerState.BOOKING]: {
            "--booker-max-width": "2000px",
            "--booker-max-height": "2000px",
          } as MotionStyleWithCssVar,
        }}
        animate={status}
        transition={{ ease: "easeInOut", duration: 0.4 }}
        className="md:max-h[var(--booker-max-height)] md:max-w[var(--booker-max-width)] flex max-w-[90%] items-center justify-center">
        <m.div
          layout
          className="dark:bg-darkgray-100 dark:border-darkgray-300 flex h-full w-full flex-col rounded-md border border-gray-200 bg-white md:flex-row">
          <AnimatePresence>
            <m.div
              layout
              className="dark:border-darkgray-300 border-gray-200 p-6 md:w-[280px] md:min-w-[280px] md:border-r">
              {event.isFetching && (
                <m.div {...fadeInUp} initial="visible" layout>
                  <EventMetaSkeleton />
                </m.div>
              )}
              {!event.isFetching && !!event.data && (
                <m.div
                  className="space-y-4"
                  {...fadeInUp}
                  layout
                  transition={{ ...fadeInUp.transition, delay: 0.3 }}>
                  <EventMembers meetingType={event.data.meetingType} users={event.data.users} />
                  <EventTitle>{event.data?.title}</EventTitle>
                  <EventDetails event={event.data} />
                  <EventMeta contentClassName="relative" icon={FiGlobe}>
                    <span className="dark:bg-darkgray-100 pointer-events-none absolute left-0 top-0 z-10 flex h-full w-full items-center bg-white">
                      {timezone} <FiChevronDown className="ml-2 inline-block" />
                    </span>
                    <TimezoneSelect
                      className="[&_.cal-react-select\_\_control]:border-0"
                      value={timezone}
                      onChange={(tz) => setTimezone(tz.value)}
                    />
                  </EventMeta>
                </m.div>
              )}
            </m.div>

            <AnimatePresence>
              {status === "booking" && (
                <m.div layout {...fadeInUp} className="p-6 md:w-[425px] md:min-w-[425px]">
                  <BookEventForm
                    username={username}
                    eventSlug={eventSlug}
                    onCancel={() => setBookingTime(null)}
                  />
                </m.div>
              )}

              {status !== "booking" && (
                <>
                  <m.div layout {...fadeInUp} initial="visible" className="p-6 md:w-[425px] md:min-w-[425px]">
                    {/* @TODO: Guts of this component aren't touched (yet) */}
                    <DatePicker
                      isLoading={schedule.isLoading}
                      onChange={onDaySelect}
                      onMonthChange={onMonthChange}
                      includedDates={nonEmptyScheduleDays}
                      // @TODO: Dynamic locale
                      locale="en"
                      browsingDate={browsingMonthStart}
                    />
                  </m.div>
                  {slots.length > 0 && selectedDate && (
                    <div>
                      <div className="dark:border-darkgray-300 flex h-full min-h-full w-full flex-col overflow-y-auto border-l border-gray-200 p-6 pb-0 md:min-w-[300px]">
                        <m.div {...fadeInLeft} layout className="flex-grow md:h-[400px]">
                          <AvailableTimes
                            onTimeSelect={onTimeSelect}
                            date={dayjs(selectedDate)}
                            slots={slots}
                            timezone={timezone}
                          />
                        </m.div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </AnimatePresence>
          </AnimatePresence>
        </m.div>
      </m.div>
    </>
  );
};

export const Booker = (props: BookerProps) => (
  <LazyMotion features={domAnimation}>
    <BookerAtom {...props} />
  </LazyMotion>
);
