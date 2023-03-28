import type { MotionStyle } from "framer-motion";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import { Fragment, useEffect, useRef } from "react";
import StickyBox from "react-sticky-box";
import { shallow } from "zustand/shallow";

import CustomBranding from "@calcom/lib/CustomBranding";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { Logo, ToggleGroup } from "@calcom/ui";
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
import { useEvent } from "./utils/event";

const BookerComponent = ({ username, eventSlug, month, rescheduleBooking }: BookerProps) => {
  const { t } = useLocale();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");
  const timeslotsRef = useRef<HTMLDivElement>(null);
  const StickyOnDesktop = isMobile ? "div" : StickyBox;
  const rescheduleUid =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("rescheduleUid") : null;
  const event = useEvent();
  const [layout, setLayout] = useBookerStore((state) => [state.layout, state.setLayout], shallow);
  const [bookerState, setBookerState] = useBookerStore((state) => [state.state, state.setState], shallow);
  const selectedDate = useBookerStore((state) => state.selectedDate);
  const [selectedTimeslot, setSelectedTimeslot] = useBookerStore(
    (state) => [state.selectedTimeslot, state.setSelectedTimeslot],
    shallow
  );

  useInitializeBookerStore({
    username,
    eventSlug,
    month,
    eventId: event?.data?.id,
    rescheduleUid,
    rescheduleBooking,
  });

  useEffect(() => {
    setLayout(isMobile ? "mobile" : "small_calendar");
  }, [isMobile, setLayout]);

  useEffect(() => {
    if (event.isLoading) return setBookerState("loading");
    if (!selectedDate) return setBookerState("selecting_date");
    if (!selectedTimeslot) return setBookerState("selecting_time");
    return setBookerState("booking");
  }, [event, selectedDate, selectedTimeslot, setBookerState]);

  useEffect(() => {
    if (layout === "mobile") {
      timeslotsRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [layout, selectedDate]);

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
              { value: "small_calendar", label: <FiCalendar />, tooltip: t("switch_monthly") },
              { value: "large_calendar", label: <FiGrid />, tooltip: t("switch_weekly") },
              { value: "large_timeslots", label: <FiColumns />, tooltip: t("switch_multiday") },
            ]}
          />
        </div>
      )}
      <div className="flex h-full flex-col items-center">
        <m.div
          layout
          // Passing the default animation styles here as the styles, makes sure that there's no initial loading state
          // where there's no styles applied yet (meaning there wouldn't be a grid + widths), which would cause
          // the layout to jump around on load.
          style={resizeAnimationConfig.small_calendar.default as MotionStyle}
          animate={resizeAnimationConfig[layout]?.[bookerState] || resizeAnimationConfig[layout].default}
          transition={{ ease: "easeInOut", duration: 0.4 }}
          className={classNames(
            "mb-6 [--booker-meta-width:280px] [--booker-main-width:480px] [--booker-timeslots-width:240px] lg:[--booker-timeslots-width:280px]",
            "dark:bg-darkgray-100 max-w-screen grid items-start overflow-x-clip bg-white dark:[color-scheme:dark] md:flex-row",
            layout === "small_calendar" &&
              "dark:border-darkgray-300 mt-20 min-h-[450px] w-[calc(var(--booker-meta-width)+var(--booker-main-width))] rounded-md border border-gray-200",
            layout !== "small_calendar" && "h-auto min-h-screen w-screen"
          )}>
          <AnimatePresence>
            <StickyOnDesktop key="meta" className="relative z-10">
              <BookerSection area="meta" className="max-w-screen w-full md:w-[var(--booker-meta-width)]">
                <EventMeta />
                {layout !== "small_calendar" && !(layout === "mobile" && bookerState === "booking") && (
                  <div className=" mt-auto p-6">
                    <DatePicker />
                  </div>
                )}
              </BookerSection>
            </StickyOnDesktop>

            <BookerSection
              key="book-event-form"
              area="main"
              className="dark:border-darkgray-300 sticky top-0 ml-[-1px] h-full border-gray-200 p-6 md:w-[var(--booker-main-width)] md:border-l"
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
              className="md:dark:border-darkgray-300 ml-[-1px] h-full flex-shrink p-6 md:border-l md:border-gray-200 lg:w-[var(--booker-main-width)]">
              <DatePicker />
            </BookerSection>

            <BookerSection
              key="large-calendar"
              area="main"
              visible={
                layout === "large_calendar" &&
                (bookerState === "selecting_date" || bookerState === "selecting_time")
              }
              className="dark:border-darkgray-300 sticky top-0 ml-[-1px] h-full border-gray-200 md:border-l"
              {...fadeInUp}>
              <LargeCalendar />
            </BookerSection>

            <BookerSection
              key="timeslots"
              area={{ default: "main", small_calendar: "timeslots" }}
              visible={
                (layout !== "large_calendar" && bookerState === "selecting_time") ||
                (layout === "large_timeslots" && bookerState !== "booking")
              }
              className={classNames(
                "dark:border-darkgray-300 flex h-full w-full flex-row border-gray-200 p-6 pb-0 md:border-l",
                layout === "small_calendar" && "h-full overflow-auto md:w-[var(--booker-timeslots-width)]",
                layout !== "small_calendar" && "sticky top-0"
              )}
              ref={timeslotsRef}
              {...fadeInLeft}>
              <AvailableTimeSlots
                extraDays={layout === "large_timeslots" ? (isTablet ? 2 : 4) : 0}
                limitHeight={layout === "small_calendar"}
                seatsPerTimeslot={event.data?.seatsPerTimeSlot}
              />
            </BookerSection>
          </AnimatePresence>
        </m.div>
        <span className="mt-auto mb-6">
          <Logo small />
        </span>
      </div>
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
