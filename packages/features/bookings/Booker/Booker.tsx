import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useRef, useMemo } from "react";
import StickyBox from "react-sticky-box";
import { shallow } from "zustand/shallow";

import classNames from "@calcom/lib/classNames";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { BookerLayouts, defaultBookerLayoutSettings } from "@calcom/prisma/zod-utils";

import { AvailableTimeSlots } from "./components/AvailableTimeSlots";
import { BookEventForm } from "./components/BookEventForm";
import { BookFormAsModal } from "./components/BookEventForm/BookFormAsModal";
import { EventMeta } from "./components/EventMeta";
import { Header } from "./components/Header";
import { LargeCalendar } from "./components/LargeCalendar";
import { BookerSection } from "./components/Section";
import { Away, NotFound } from "./components/Unavailable";
import { extraDaysConfig, fadeInLeft, getBookerSizeClassNames, useBookerResizeAnimation } from "./config";
import { useBookerStore, useInitializeBookerStore } from "./store";
import type { BookerProps } from "./types";
import { useEvent } from "./utils/event";
import { validateLayout } from "./utils/layout";
import { getQueryParam } from "./utils/query-param";
import { useBrandColors } from "./utils/use-brand-colors";

const PoweredBy = dynamic(() => import("@calcom/ee/components/PoweredBy"));
const DatePicker = dynamic(() => import("./components/DatePicker").then((mod) => mod.DatePicker), {
  ssr: false,
});

const BookerComponent = ({
  username,
  eventSlug,
  month,
  rescheduleBooking,
  hideBranding = false,
}: BookerProps) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");
  const timeslotsRef = useRef<HTMLDivElement>(null);
  const StickyOnDesktop = isMobile ? "div" : StickyBox;
  const rescheduleUid =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("rescheduleUid") : null;
  const event = useEvent();
  const [layout, setLayout] = useBookerStore((state) => [state.layout, state.setLayout], shallow);
  if (typeof window !== "undefined") {
    window.CalEmbed.setLayout = setLayout;
  }
  const [bookerState, setBookerState] = useBookerStore((state) => [state.state, state.setState], shallow);
  const selectedDate = useBookerStore((state) => state.selectedDate);
  const [selectedTimeslot, setSelectedTimeslot] = useBookerStore(
    (state) => [state.selectedTimeslot, state.setSelectedTimeslot],
    shallow
  );

  const extraDays = isTablet ? extraDaysConfig[layout].tablet : extraDaysConfig[layout].desktop;
  const bookerLayouts = event.data?.profile?.bookerLayouts || defaultBookerLayoutSettings;
  const animationScope = useBookerResizeAnimation(layout, bookerState);
  const isEmbed = typeof window !== "undefined" && window?.isEmbed?.();

  // We only want the initial url value, that's why we memo it. The embed seems to change the url, which sometimes drops
  // the layout query param.
  const layoutFromQueryParam = useMemo(() => validateLayout(getQueryParam("layout") as BookerLayouts), []);
  const defaultLayout = isEmbed
    ? layoutFromQueryParam || BookerLayouts.MONTH_VIEW
    : bookerLayouts.defaultLayout;

  useBrandColors({
    brandColor: event.data?.profile.brandColor,
    darkBrandColor: event.data?.profile.darkBrandColor,
    theme: event.data?.profile.theme,
  });

  useInitializeBookerStore({
    username,
    eventSlug,
    month,
    eventId: event?.data?.id,
    rescheduleUid,
    rescheduleBooking,
    layout: defaultLayout,
  });

  useEffect(() => {
    if (isMobile && layout !== "mobile") {
      setLayout("mobile");
    } else if (!isMobile && layout === "mobile") {
      setLayout(defaultLayout);
    }
  }, [isMobile, setLayout, layout, defaultLayout]);

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

  if (event.isSuccess && !event.data) {
    return <NotFound />;
  }

  return (
    <>
      <div className="text-default flex min-h-full w-full flex-col items-center overflow-clip">
        <div
          ref={animationScope}
          className={classNames(
            // Sets booker size css variables for the size of all the columns.
            ...getBookerSizeClassNames(layout, bookerState),
            "bg-default dark:bg-muted grid max-w-full items-start dark:[color-scheme:dark] sm:transition-[width] sm:duration-300 sm:motion-reduce:transition-none md:flex-row",
            layout === BookerLayouts.MONTH_VIEW && "border-subtle rounded-md border",
            !isEmbed && "sm:transition-[width] sm:duration-300",
            isEmbed && layout === BookerLayouts.MONTH_VIEW && "border-booker sm:border-booker-width",
            !isEmbed && layout === BookerLayouts.MONTH_VIEW && "border-subtle",
            layout === BookerLayouts.MONTH_VIEW && isEmbed && "mt-20"
          )}>
          <AnimatePresence>
            <BookerSection
              area="header"
              className={classNames(
                layout === BookerLayouts.MONTH_VIEW && "fixed top-3 right-3 z-10",
                (layout === BookerLayouts.COLUMN_VIEW || layout === BookerLayouts.WEEK_VIEW) &&
                  "bg-muted sticky top-0 z-10"
              )}>
              <Header
                enabledLayouts={bookerLayouts.enabledLayouts}
                extraDays={extraDays}
                isMobile={isMobile}
              />
            </BookerSection>
            <StickyOnDesktop
              key="meta"
              className={classNames(
                "relative z-10 flex",
                layout !== BookerLayouts.MONTH_VIEW && "sm:min-h-screen"
              )}>
              <BookerSection
                area="meta"
                className="max-w-screen flex w-full flex-col md:w-[var(--booker-meta-width)]">
                <EventMeta />
                {layout !== BookerLayouts.MONTH_VIEW &&
                  !(layout === "mobile" && bookerState === "booking") && (
                    <div className=" mt-auto px-5 py-3">
                      <DatePicker />
                    </div>
                  )}
              </BookerSection>
            </StickyOnDesktop>

            <BookerSection
              key="book-event-form"
              area="main"
              className="border-subtle sticky top-0 ml-[-1px] h-full px-5 py-3 md:w-[var(--booker-main-width)] md:border-l"
              {...fadeInLeft}
              visible={bookerState === "booking" && layout === BookerLayouts.MONTH_VIEW}>
              <BookEventForm onCancel={() => setSelectedTimeslot(null)} />
            </BookerSection>

            <BookerSection
              key="datepicker"
              area="main"
              visible={bookerState !== "booking" && layout === BookerLayouts.MONTH_VIEW}
              {...fadeInLeft}
              initial="visible"
              className="md:border-subtle ml-[-1px] h-full flex-shrink px-5 py-3 md:border-l lg:w-[var(--booker-main-width)]">
              <DatePicker />
            </BookerSection>

            <BookerSection
              key="large-calendar"
              area="main"
              visible={layout === BookerLayouts.WEEK_VIEW}
              className="border-subtle sticky top-0 ml-[-1px] h-full md:border-l"
              {...fadeInLeft}>
              <LargeCalendar extraDays={extraDays} />
            </BookerSection>

            <BookerSection
              key="timeslots"
              area={{ default: "main", month_view: "timeslots" }}
              visible={
                (layout !== BookerLayouts.WEEK_VIEW && bookerState === "selecting_time") ||
                layout === BookerLayouts.COLUMN_VIEW
              }
              className={classNames(
                "border-subtle flex h-full w-full flex-col px-5 py-3 pb-0 md:border-l",
                layout === BookerLayouts.MONTH_VIEW &&
                  "scroll-bar h-full overflow-auto md:w-[var(--booker-timeslots-width)]",
                layout !== BookerLayouts.MONTH_VIEW && "sticky top-0"
              )}
              ref={timeslotsRef}
              {...fadeInLeft}>
              <AvailableTimeSlots
                extraDays={extraDays}
                limitHeight={layout === BookerLayouts.MONTH_VIEW}
                seatsPerTimeslot={event.data?.seatsPerTimeSlot}
              />
            </BookerSection>
          </AnimatePresence>
        </div>

        <m.span
          key="logo"
          className={classNames(
            "mt-auto mb-6 pt-6 [&_img]:h-[15px]",
            layout === BookerLayouts.MONTH_VIEW ? "block" : "hidden"
          )}>
          {!hideBranding ? <PoweredBy logoOnly /> : null}
        </m.span>
      </div>

      <BookFormAsModal
        visible={layout !== BookerLayouts.MONTH_VIEW && bookerState === "booking"}
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
