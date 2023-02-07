import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

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
import classNames from "@calcom/lib/classNames";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { trpc } from "@calcom/trpc/react";
import { TimezoneSelect, ToggleGroup } from "@calcom/ui";
import { FiChevronDown, FiGlobe } from "@calcom/ui/components/icon";

import { BookerSection } from "./components/Section";
import { fadeInUp, fadeInLeft, resizeAnimationConfig } from "./config";
import { useBookerStore } from "./store";
import { BookerLayout, BookerProps } from "./types";
import { useGetBrowsingMonthStart } from "./utils/dates";
import { useTimePrerences } from "./utils/time";

const BookerAtom = ({ username, eventSlug, month }: BookerProps) => {
  const { timezone, setTimezone } = useTimePrerences();
  const [browsingMonthStart, setBrowsingMonthStart] = useGetBrowsingMonthStart(month);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const schedule = useScheduleWithCache({ username, eventSlug, browsingMonth: browsingMonthStart, timezone });
  const slots = useSlotsForDate(selectedDate, schedule);
  const nonEmptyScheduleDays = useNonEmptyScheduleDays(schedule);
  const event = trpc.viewer.public.event.useQuery({ username, eventSlug }, { refetchOnWindowFocus: false });
  const [bookingTime, setBookingTime] = useState<string | null>(null);

  const layout = useBookerStore((state) => state.layout);
  const setLayout = useBookerStore((state) => state.setLayout);
  const state = useBookerStore((state) => state.state);
  const setState = useBookerStore((state) => state.setState);
  // Custom breakpoint to make calendar fit.
  const isMobile = useMediaQuery("(max-width: 800px)");

  const onMonthChange = (date: Dayjs) => {
    setBrowsingMonthStart(date);
    setSelectedDate(null);
  };

  const onDaySelect = (date: Dayjs) => {
    setSelectedDate(date.format("YYYY-MM-DD"));
  };

  const onTimeSelect = (time: string) => {
    setBookingTime(time);
  };

  useEffect(() => {
    if (isMobile) {
      setLayout("mobile");
    } else {
      setLayout("small_calendar");
    }
  }, [isMobile, setLayout]);

  useEffect(() => {
    if (event.isLoading) return setState("loading");
    if (!selectedDate) return setState("selecting_date");
    if (!bookingTime) return setState("selecting_time");
    return setState("booking");
  }, [event, selectedDate, bookingTime, setState]);

  return (
    <>
      {/* @TODO: This is imported because the DatePicker relies on it. Perhaps
      rewrite the datepicker as well? */}
      <CustomBranding />
      {/*
        If we would render this on mobile, it would unset the mobile variant,
        since that's not a valid option, so it would set the layout to null.
      */}
      {!isMobile && (
        <div className="absolute top-2 right-3 z-10 [&>div]:bg-white">
          <ToggleGroup
            onValueChange={(layout) => setLayout(layout as BookerLayout)}
            defaultValue="small_calendar"
            options={[
              { value: "small_calendar", label: "Small calendar" },
              { value: "large_calendar", label: "Weekview" },
              { value: "large_timeslots", label: "Timeslots" },
            ]}
          />
        </div>
      )}
      <m.div
        layout
        style={resizeAnimationConfig[layout]?.style}
        animate={
          resizeAnimationConfig[layout]?.variants?.[state] || resizeAnimationConfig[layout]?.variants.default
        }
        transition={{ ease: "easeInOut", duration: 0.4 }}
        className={classNames(
          "dark:bg-darkgray-100 grid bg-white md:flex-row",
          layout === "small_calendar" && "dark:border-darkgray-300 mt-20 rounded-md border border-gray-200"
        )}>
        <AnimatePresence>
          <m.div
            layout
            className="dark:border-darkgray-300 relative z-10 overflow-auto border-gray-200 p-6 [grid-area:meta] md:border-r">
            {event.isLoading && (
              <m.div {...fadeInUp} initial="visible" layout>
                <EventMetaSkeleton />
              </m.div>
            )}
            {!event.isLoading && !!event.data && (
              <m.div {...fadeInUp} layout transition={{ ...fadeInUp.transition, delay: 0.3 }}>
                <EventMembers meetingType={event.data.meetingType} users={event.data.users} />
                <EventTitle className="mt-2 mb-8">{event.data?.title}</EventTitle>
                <div className="space-y-5">
                  <EventDetails event={event.data} />
                  <EventMeta contentClassName="relative" icon={FiGlobe}>
                    <span className="dark:bg-darkgray-100 pointer-events-none absolute left-0 -top-1 z-10 flex h-full w-full items-center bg-white">
                      {timezone} <FiChevronDown className="ml-2 inline-block" />
                    </span>
                    {/* @TODO: When old booking page is gone, hopefully we can improve the select component itself :)  */}
                    <TimezoneSelect
                      className="[&_.cal-react-select\_\_control]:h-auto [&_.cal-react-select\_\_control]:min-h-0 [&_.cal-react-select\_\_control]:border-0 [&_.cal-react-select\_\_control]:ring-0 [&_.cal-react-select\_\_indicators]:hidden [&_.cal-react-select\_\_menu]:w-[300px]"
                      value={timezone}
                      onChange={(tz) => setTimezone(tz.value)}
                    />
                  </EventMeta>
                </div>
              </m.div>
            )}
          </m.div>

          <BookerSection area="main" {...fadeInUp} visible={state === "booking"} className="p-6">
            <BookEventForm username={username} eventSlug={eventSlug} onCancel={() => setBookingTime(null)} />
          </BookerSection>

          <BookerSection
            area={["calendar", { layout: "small_calendar", area: "main" }]}
            visible={state !== "booking" || layout !== "small_calendar"}
            {...fadeInUp}
            initial="visible"
            className="p-6">
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
          </BookerSection>

          <BookerSection
            area="main"
            visible={layout === "large_calendar" && state === "selecting_date"}
            className="flex h-full w-full items-center justify-center dark:text-white">
            <div>
              Something big is coming...
              <br />
              <button
                className="underline"
                type="button"
                onClick={(ev) => {
                  ev.preventDefault();
                  onDaySelect(dayjs());
                  onTimeSelect(dayjs().format());
                }}>
                Click this button to set date + time in one go just like the big thing that's coming here
                would do. :)
              </button>
            </div>
          </BookerSection>

          <BookerSection
            area={["main", { layout: "small_calendar", area: "timeslots" }]}
            visible={state === "selecting_time"}
            className="dark:border-darkgray-300 flex w-full flex-col overflow-y-auto border-l border-gray-200 p-6 pb-0 md:min-w-[var(--booker-timeslots-width)]"
            {...fadeInLeft}>
            {/* @TODO: Weekstart day */}
            {/* @TODO: recurring event count */}
            {/* @TODO: eth signature */}
            {/* @TODO: seats per timeslot */}
            <div className="flex-grow md:h-[400px]">
              {slots.length > 0 && selectedDate && (
                <AvailableTimes
                  onTimeSelect={onTimeSelect}
                  date={dayjs(selectedDate)}
                  slots={slots}
                  timezone={timezone}
                />
              )}
            </div>
          </BookerSection>
        </AnimatePresence>
      </m.div>
    </>
  );
};

export const Booker = (props: BookerProps) => (
  <LazyMotion features={domAnimation}>
    <BookerAtom {...props} />
  </LazyMotion>
);
