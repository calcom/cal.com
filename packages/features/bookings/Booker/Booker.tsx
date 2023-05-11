import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
import StickyBox from "react-sticky-box";
import { shallow } from "zustand/shallow";

import classNames from "@calcom/lib/classNames";
import useGetBrandingColours from "@calcom/lib/getBrandColours";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { ToggleGroup, useCalcomTheme } from "@calcom/ui";
import { Calendar, Columns, Grid } from "@calcom/ui/components/icon";

import { AvailableTimeSlots } from "./components/AvailableTimeSlots";
import { Away } from "./components/Away";
import { BookEventForm } from "./components/BookEventForm";
import { BookFormAsModal } from "./components/BookEventForm/BookFormAsModal";
import { EventMeta } from "./components/EventMeta";
import { LargeCalendar } from "./components/LargeCalendar";
import { LargeViewHeader } from "./components/LargeViewHeader";
import { BookerSection } from "./components/Section";
import { fadeInLeft, getBookerSizeClassNames, useBookerResizeAnimation } from "./config";
import { useBookerStore, useInitializeBookerStore } from "./store";
import type { BookerLayout, BookerProps } from "./types";
import { useEvent } from "./utils/event";

const PoweredBy = dynamic(() => import("@calcom/ee/components/PoweredBy"));
const DatePicker = dynamic(() => import("./components/DatePicker").then((mod) => mod.DatePicker), {
  ssr: false,
});

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
  const extraDays = layout === "large_timeslots" ? (isTablet ? 2 : 4) : 0;
  const onLayoutToggle = useCallback((newLayout: BookerLayout) => setLayout(newLayout), [setLayout]);

  const animationScope = useBookerResizeAnimation(layout, bookerState);

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
    if (isMobile && layout !== "mobile") {
      setLayout("mobile");
    } else if (!isMobile && layout === "mobile") {
      setLayout("small_calendar");
    }
  }, [isMobile, setLayout, layout]);

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
  }, [layout]);

  return (
    <>
      {/*
        If we would render this on mobile, it would unset the mobile variant,
        since that's not a valid option, so it would set the layout to null.
      */}
      {!isMobile && (
        <div className="[&>div]:bg-muted fixed top-2 right-3 z-10">
          <ToggleGroup
            onValueChange={onLayoutToggle}
            defaultValue={layout}
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
        <div
          ref={animationScope}
          className={classNames(
            // Sets booker size css variables for the size of all the columns.
            ...getBookerSizeClassNames(layout, bookerState),
            "bg-muted grid max-w-full auto-rows-fr items-start overflow-clip dark:[color-scheme:dark] sm:transition-[width] sm:duration-300 sm:motion-reduce:transition-none md:flex-row",
            layout === "small_calendar" && "border-subtle rounded-md border"
          )}>
          <AnimatePresence>
            <StickyOnDesktop key="meta" className="relative z-10 flex min-h-full">
              <BookerSection
                area="meta"
                className="max-w-screen flex w-full flex-col md:w-[var(--booker-meta-width)]">
                <EventMeta />
                {layout !== "small_calendar" && !(layout === "mobile" && bookerState === "booking") && (
                  <div className=" mt-auto p-5">
                    <DatePicker />
                  </div>
                )}
              </BookerSection>
            </StickyOnDesktop>

            <BookerSection
              key="book-event-form"
              area="main"
              className="border-subtle sticky top-0 ml-[-1px] h-full p-5 md:w-[var(--booker-main-width)] md:border-l"
              {...fadeInLeft}
              visible={bookerState === "booking" && layout !== "large_timeslots"}>
              <BookEventForm onCancel={() => setSelectedTimeslot(null)} />
            </BookerSection>

            <BookerSection
              key="datepicker"
              area="main"
              visible={bookerState !== "booking" && layout === "small_calendar"}
              {...fadeInLeft}
              initial="visible"
              className="md:border-subtle ml-[-1px] h-full flex-shrink p-5 md:border-l lg:w-[var(--booker-main-width)]">
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
              {...fadeInLeft}>
              <LargeCalendar />
            </BookerSection>

            <BookerSection
              key="timeslots"
              area={{ default: "main", small_calendar: "timeslots" }}
              visible={
                (layout !== "large_calendar" && bookerState === "selecting_time") ||
                layout === "large_timeslots"
              }
              className={classNames(
                "border-subtle flex h-full w-full flex-col p-5 pb-0 md:border-l",
                layout === "small_calendar" &&
                  "scroll-bar h-full overflow-auto md:w-[var(--booker-timeslots-width)]",
                layout !== "small_calendar" && "sticky top-0"
              )}
              ref={timeslotsRef}
              {...fadeInLeft}>
              {layout === "large_timeslots" && <LargeViewHeader extraDays={extraDays} />}
              <AvailableTimeSlots
                extraDays={extraDays}
                limitHeight={layout === "small_calendar"}
                seatsPerTimeslot={event.data?.seatsPerTimeSlot}
              />
            </BookerSection>
          </AnimatePresence>
        </div>

        <m.span
          key="logo"
          className={classNames(
            "mt-auto mb-6 pt-6 [&_img]:h-[15px]",
            layout === "small_calendar" ? "block" : "hidden"
          )}>
          <PoweredBy logoOnly />
        </m.span>
      </div>

      <BookFormAsModal
        visible={layout === "large_timeslots" && bookerState === "booking"}
        onCancel={() => setSelectedTimeslot(null)}
      />
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
