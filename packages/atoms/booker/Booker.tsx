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
import { Icon, TimezoneSelect } from "@calcom/ui";

import { fadeInUp, fadeInLeft } from "./config";
import { useGetBrowsingMonthStart } from "./utils/dates";
import { useTimePrerences } from "./utils/time";

enum BookerState {
  LOADING = "loading",
  SELECTING_DATE = "selecting_date",
  SELECTING_TIME = "selecting_time",
  BOOKING = "booking",
}

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
        style={{ maxWidth: "700px", maxHeight: "412px" }}
        variants={{
          [BookerState.LOADING]: { maxWidth: "700px", maxHeight: "412px" },
          [BookerState.SELECTING_DATE]: { maxWidth: "700px", maxHeight: "2000px" },
          [BookerState.SELECTING_TIME]: { maxWidth: "2000px", maxHeight: "2000px" },
          [BookerState.BOOKING]: { maxWidth: "2000px", maxHeight: "2000px" },
        }}
        animate={status}
        transition={{ ease: "easeInOut", duration: 0.4 }}
        className="flex items-center justify-center overflow-hidden">
        <m.div
          layout
          className="dark:bg-darkgray-100 dark:border-darkgray-300 flex h-full max-h-[540px] w-full flex-row rounded-md border border-gray-200 bg-white">
          <AnimatePresence>
            <m.div
              layout
              className="dark:border-darkgray-300 w-[280px] min-w-[280px] border-r border-gray-200 p-6">
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
                  <EventMeta contentClassName="relative" icon={Icon.FiGlobe}>
                    <span className="dark:bg-darkgray-100 pointer-events-none absolute left-0 top-0 z-10 flex h-full w-full items-center bg-white">
                      {timezone} <Icon.FiChevronDown className="ml-2 inline-block" />
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
                <m.div layout {...fadeInUp} className="w-[425px] min-w-[425px] p-6">
                  <BookEventForm username={username} eventSlug={eventSlug} />
                </m.div>
              )}

              {status !== "booking" && (
                <>
                  <m.div layout {...fadeInUp} initial="visible" className="w-[425px] min-w-[425px] p-6">
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
                      <div className="dark:border-darkgray-300 flex h-full min-h-full w-full min-w-[300px] flex-col overflow-y-auto border-l border-gray-200 p-6 pb-0">
                        <m.div {...fadeInLeft} layout className="h-[400px] flex-grow">
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
