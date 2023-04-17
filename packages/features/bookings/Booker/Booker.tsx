import type { MotionStyle } from "framer-motion";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import { Fragment, useEffect, useRef } from "react";
import StickyBox from "react-sticky-box";
import { shallow } from "zustand/shallow";

import classNames from "@calcom/lib/classNames";
import useGetBrandingColours from "@calcom/lib/getBrandColours";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { Logo, ToggleGroup, useCalcomTheme } from "@calcom/ui";
import { Calendar, Columns, Grid } from "@calcom/ui/components/icon";

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

const useBrandColors = ({ brandColor, darkBrandColor }: { brandColor?: string; darkBrandColor?: string }) => {
  const brandTheme = useGetBrandingColours({
    lightVal: brandColor,
    darkVal: darkBrandColor,
  });
  useCalcomTheme(brandTheme);
};

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

  useBrandColors({
    brandColor: event.data?.profile.brandColor,
    darkBrandColor: event.data?.profile.darkBrandColor,
  });

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
      {/*
        If we would render this on mobile, it would unset the mobile variant,
        since that's not a valid option, so it would set the layout to null.
      */}
      {!isMobile && (
        <div className="[&>div]:bg-muted fixed top-2 right-3 z-10">
          <ToggleGroup
            onValueChange={(layout) => setLayout(layout as BookerLayout)}
            defaultValue="small_calendar"
            options={[
              {
                value: "small_calendar",
                label: <Calendar width="16" height="16" />,
                tooltip: t("switch_monthly"),
              },
              {
                value: "large_calendar",
                label: <Grid width="16" height="16" />,
                tooltip: t("switch_weekly"),
              },
              {
                value: "large_timeslots",
                label: <Columns width="16" height="16" />,
                tooltip: t("switch_multiday"),
              },
            ]}
          />
        </div>
      )}
      <div className="flex h-full w-full flex-col items-center">
        <m.div
          layout
          // Passing the default animation styles here as the styles, makes sure that there's no initial loading state
          // where there's no styles applied yet (meaning there wouldn't be a grid + widths), which would cause
          // the layout to jump around on load.
          style={resizeAnimationConfig.small_calendar.default as MotionStyle}
          animate={resizeAnimationConfig[layout]?.[bookerState] || resizeAnimationConfig[layout].default}
          transition={{ ease: "easeInOut", duration: 0.4 }}
          className={classNames(
            "[--booker-meta-width:280px] [--booker-main-width:480px] [--booker-timeslots-width:240px] lg:[--booker-timeslots-width:280px]",
            "bg-muted grid max-w-full items-start overflow-clip dark:[color-scheme:dark] md:flex-row",
            layout === "small_calendar" &&
              "border-subtle mt-20 min-h-[450px] w-[calc(var(--booker-meta-width)+var(--booker-main-width))] rounded-md border",
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
              className="border-subtle sticky top-0 ml-[-1px] h-full p-6 md:w-[var(--booker-main-width)] md:border-l"
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
              className="md:border-subtle ml-[-1px] h-full flex-shrink p-6 md:border-l lg:w-[var(--booker-main-width)]">
              <DatePicker />
            </BookerSection>

            <BookerSection
              key="large-calendar"
              area="main"
              visible={
                layout === "large_calendar" &&
                (bookerState === "selecting_date" || bookerState === "selecting_time")
              }
              className="border-muted sticky top-0 ml-[-1px] h-full md:border-l"
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
                "border-subtle flex h-full w-full flex-row p-6 pb-0 md:border-l",
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

        <m.span
          key="logo"
          className={classNames("mt-auto mb-6 pt-6", layout === "small_calendar" ? "block" : "hidden")}>
          <Logo small />
        </m.span>
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
