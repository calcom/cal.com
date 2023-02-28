import type { MotionStyle } from "framer-motion";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import { Fragment, useEffect } from "react";
import StickyBox from "react-sticky-box";
import { shallow } from "zustand/shallow";

import type { Dayjs } from "@calcom/dayjs";
import CustomBranding from "@calcom/lib/CustomBranding";
import classNames from "@calcom/lib/classNames";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { ToggleGroup } from "@calcom/ui";
import { FiCalendar, FiColumns, FiGrid } from "@calcom/ui/components/icon";

import { AvailableTimeSlots } from "./components/AvailableTimeSlots";
import { Away } from "./components/Away";
import { BookEventForm } from "./components/BookEventForm";
import { DatePicker } from "./components/DatePicker";
import { EventMeta } from "./components/EventMeta";
import { LargeCalendar } from "./components/LargeCalendar";
import { BookerSection } from "./components/Section";
import { fadeInUp, fadeInLeft, resizeAnimationConfig } from "./config";
import { useBookerStore, useInitializeBookerStore } from "./store";
import type { BookerLayout, BookerProps } from "./types";
import { useGetBrowsingMonthStart } from "./utils/dates";
import { useEvent } from "./utils/event";

// @TODO: Test embed view
/* @TODO: eth signature / gates */

const BookerComponent = ({ username, eventSlug, month, rescheduleBooking }: BookerProps) => {
  const [browsingMonthStart, setBrowsingMonthStart] = useGetBrowsingMonthStart(month);
  // Custom breakpoint to make calendar fit.
  const isMobile = useMediaQuery("(max-width: 800px)");
  const StickyOnDesktop = isMobile ? Fragment : StickyBox;
  const rescheduleUid =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("rescheduleUid") : null;
  const event = useEvent();
  const [layout, setLayout] = useBookerStore((state) => [state.layout, state.setLayout], shallow);
  const [bookerState, setBookerState] = useBookerStore((state) => [state.state, state.setState], shallow);
  const duration = useBookerStore((state) => state.selectedDuration);
  const [selectedDate, setSelectedDate] = useBookerStore(
    (state) => [state.selectedDate, state.setSelectedDate],
    shallow
  );
  const [selectedTimeslot, setSelectedTimeslot] = useBookerStore(
    (state) => [state.selectedTimeslot, state.setSelectedTimeslot],
    shallow
  );

  useInitializeBookerStore({
    username,
    eventSlug,
    month: browsingMonthStart.toDate(),
    eventId: event?.data?.id,
    rescheduleUid,
    rescheduleBooking,
  });

  const onMonthChange = (date: Dayjs) => {
    setBrowsingMonthStart(date);
    setSelectedDate(null);
  };

  const onDaySelect = (date: Dayjs) => {
    setSelectedDate(date.format("YYYY-MM-DD"));
  };

  const onTimeSelect = (time: string) => {
    setSelectedTimeslot(time);
  };

  useEffect(() => {
    setLayout(isMobile ? "mobile" : "small_calendar");
  }, [isMobile, setLayout]);

  useEffect(() => {
    if (event.isLoading) return setBookerState("loading");
    if (!selectedDate) return setBookerState("selecting_date");
    if (!selectedTimeslot) return setBookerState("selecting_time");
    return setBookerState("booking");
  }, [event, selectedDate, selectedTimeslot, setBookerState]);

  return (
    <>
      {/* @TODO: This is imported because the DatePicker relies on it. Perhaps
      rewrite the datepicker as well? */}
      <CustomBranding lightVal={null} darkVal={null} />
      {/*
        If we would render this on mobile, it would unset the mobile variant,
        since that's not a valid option, so it would set the layout to null.
      */}
      {!isMobile && (
        <div className="dark:[&>div]:bg-darkgray-100 fixed top-2 right-3 z-10 [&>div]:bg-white">
          <ToggleGroup
            onValueChange={(layout) => setLayout(layout as BookerLayout)}
            defaultValue="small_calendar"
            options={[
              // @TODO: Find right icon for grid, plus add a11y labels and tooltips.
              { value: "small_calendar", label: <FiCalendar /> },
              { value: "large_calendar", label: <FiGrid /> },
              { value: "large_timeslots", label: <FiColumns /> },
            ]}
          />
        </div>
      )}
      <m.div
        layout
        // Passing the default animation styles here as the styles, makes sure that there's no initial loading state
        // where there's no styles applied yet (meaning there wouldn't be a grid + widths), which would cause
        // the layout to jump around on load.
        style={resizeAnimationConfig.small_calendar.default as MotionStyle}
        animate={resizeAnimationConfig[layout]?.[bookerState] || resizeAnimationConfig[layout].default}
        transition={{ ease: "easeInOut", duration: 0.4 }}
        className={classNames(
          "dark:bg-darkgray-100 grid w-[calc(var(--booker-meta-width)+var(--booker-main-width))] items-start overflow-x-clip bg-white [--booker-meta-width:280px] [--booker-main-width:425px] [--booker-timeslots-width:280px] md:flex-row",
          layout === "small_calendar" &&
            "dark:border-darkgray-300 mt-20 min-h-[450px] rounded-md border border-gray-200",
          layout !== "small_calendar" && "h-auto min-h-screen w-screen"
        )}>
        <AnimatePresence>
          <StickyOnDesktop key="meta">
            <BookerSection area="meta">
              <EventMeta
                event={event.data}
                isLoading={event.isLoading}
                selectedTime={selectedTimeslot}
                duration={duration}
              />
              {layout !== "small_calendar" && (
                <div className=" mt-auto p-6">
                  <DatePicker onDaySelect={onDaySelect} onMonthChange={onMonthChange} />
                </div>
              )}
            </BookerSection>
          </StickyOnDesktop>

          <BookerSection
            key="book-event-form"
            area="main"
            className="dark:border-darkgray-300 sticky top-0 ml-[-1px] h-full border-gray-200 p-6 md:border-l"
            {...fadeInUp}
            visible={bookerState === "booking"}>
            <BookEventForm onCancel={() => setSelectedTimeslot(null)} />
          </BookerSection>

          <BookerSection
            key="datepicker"
            area="main"
            visible={bookerState !== "booking" && layout === "small_calendar"}
            {...fadeInUp}
            initial="visible"
            className="md:dark:border-darkgray-300 ml-[-1px] h-full p-6 md:border-l md:border-gray-200">
            <DatePicker onDaySelect={onDaySelect} onMonthChange={onMonthChange} />
          </BookerSection>

          <BookerSection
            key="large-calendar"
            area="main"
            visible={
              layout === "large_calendar" &&
              (bookerState === "selecting_date" || bookerState === "selecting_time")
            }
            className="dark:border-darkgray-300 sticky top-0  ml-[-1px] h-full border-gray-200 md:border-l"
            {...fadeInUp}>
            <LargeCalendar onDaySelect={onDaySelect} onTimeSelect={onTimeSelect} />
          </BookerSection>

          <BookerSection
            key="timeslots"
            area={{ default: "main", small_calendar: "timeslots" }}
            visible={
              (bookerState === "selecting_time" && layout === "small_calendar") ||
              (layout === "large_timeslots" && bookerState !== "booking")
            }
            className={classNames(
              "dark:border-darkgray-300 flex w-full flex-row border-gray-200 p-6 pb-0 md:border-l",
              layout === "small_calendar" && "h-full overflow-auto",
              layout !== "small_calendar" && "sticky top-0"
            )}
            {...fadeInLeft}>
            <AvailableTimeSlots
              extraDays={layout === "large_timeslots" ? 4 : 0}
              onTimeSelect={onTimeSelect}
              limitHeight={layout === "small_calendar"}
              seatsPerTimeslot={event.data?.seatsPerTimeSlot}
            />
          </BookerSection>
        </AnimatePresence>
      </m.div>
    </>
  );
};

export const Booker = (props: BookerProps) => {
  if (props.isAway) return <Away />;

  return (
    <LazyMotion features={domAnimation}>
      <BookerComponent {...props} />
    </LazyMotion>
  );
};
