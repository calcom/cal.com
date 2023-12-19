import { LazyMotion, m, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import StickyBox from "react-sticky-box";
import { shallow } from "zustand/shallow";

import BookingPageTagManager from "@calcom/app-store/BookingPageTagManager";
import dayjs from "@calcom/dayjs";
import { useEmbedType, useEmbedUiConfig, useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { useNonEmptyScheduleDays } from "@calcom/features/schedules";
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
import type { BookerLayout, BookerProps } from "./types";
import { useEvent, useScheduleForEvent } from "./utils/event";
import { validateLayout } from "./utils/layout";
import { getQueryParam } from "./utils/query-param";
import { useBrandColors } from "./utils/use-brand-colors";

const loadFramerFeatures = () => import("./framer-features").then((res) => res.default);
const PoweredBy = dynamic(() => import("@calcom/ee/components/PoweredBy"));
const UnpublishedEntity = dynamic(() => import("@calcom/ui").then((mod) => mod.UnpublishedEntity));
const DatePicker = dynamic(() => import("./components/DatePicker").then((mod) => mod.DatePicker), {
  ssr: false,
});

const BookerComponent = ({
  username,
  eventSlug,
  month,
  bookingData,
  hideBranding = false,
  isTeamEvent,
  entity,
  durationConfig,
  duration,
  hashedLink,
}: BookerProps) => {
  /**
   * Prioritize dateSchedule load
   * Component will render but use data already fetched from here, and no duplicate requests will be made
   * */
  const schedule = useScheduleForEvent({
    prefetchNextMonth: false,
    username,
    eventSlug,
    month,
    duration,
  });
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");
  const timeslotsRef = useRef<HTMLDivElement>(null);
  const StickyOnDesktop = isMobile ? "div" : StickyBox;
  const rescheduleUid =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("rescheduleUid") : null;
  const bookingUid =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("bookingUid") : null;
  const event = useEvent();
  const [_layout, setLayout] = useBookerStore((state) => [state.layout, state.setLayout], shallow);

  const isEmbed = useIsEmbed();
  const embedType = useEmbedType();
  // Floating Button and Element Click both are modal and thus have dark background
  const hasDarkBackground = isEmbed && embedType !== "inline";
  const embedUiConfig = useEmbedUiConfig();

  // In Embed we give preference to embed configuration for the layout.If that's not set, we use the App configuration for the event layout
  // But if it's mobile view, there is only one layout supported which is 'mobile'
  const layout = isEmbed ? (isMobile ? "mobile" : validateLayout(embedUiConfig.layout) || _layout) : _layout;
  const columnViewExtraDays = useRef<number>(
    isTablet ? extraDaysConfig[layout].tablet : extraDaysConfig[layout].desktop
  );

  const [bookerState, setBookerState] = useBookerStore((state) => [state.state, state.setState], shallow);
  const selectedDate = useBookerStore((state) => state.selectedDate);
  const [selectedTimeslot, setSelectedTimeslot] = useBookerStore(
    (state) => [state.selectedTimeslot, state.setSelectedTimeslot],
    shallow
  );
  // const seatedEventData = useBookerStore((state) => state.seatedEventData);
  const [seatedEventData, setSeatedEventData] = useBookerStore(
    (state) => [state.seatedEventData, state.setSeatedEventData],
    shallow
  );

  const date = dayjs(selectedDate).format("YYYY-MM-DD");

  const nonEmptyScheduleDays = useNonEmptyScheduleDays(schedule?.data?.slots).filter(
    (slot) => dayjs(selectedDate).diff(slot, "day") <= 0
  );

  const extraDays = isTablet ? extraDaysConfig[layout].tablet : extraDaysConfig[layout].desktop;
  const bookerLayouts = event.data?.profile?.bookerLayouts || defaultBookerLayoutSettings;
  const animationScope = useBookerResizeAnimation(layout, bookerState);
  const totalWeekDays = 7;
  const addonDays =
    nonEmptyScheduleDays.length < extraDays
      ? (extraDays - nonEmptyScheduleDays.length + 1) * totalWeekDays
      : nonEmptyScheduleDays.length === extraDays
      ? totalWeekDays
      : 0;

  // Taking one more available slot(extraDays + 1) to calculate the no of days in between, that next and prev button need to shift.
  const availableSlots = nonEmptyScheduleDays.slice(0, extraDays + 1);
  if (nonEmptyScheduleDays.length !== 0)
    columnViewExtraDays.current =
      Math.abs(dayjs(selectedDate).diff(availableSlots[availableSlots.length - 2], "day")) + addonDays;
  const prefetchNextMonth =
    layout === BookerLayouts.COLUMN_VIEW &&
    dayjs(date).month() !== dayjs(date).add(columnViewExtraDays.current, "day").month();
  const monthCount =
    dayjs(date).add(1, "month").month() !== dayjs(date).add(columnViewExtraDays.current, "day").month()
      ? 2
      : undefined;
  const nextSlots =
    Math.abs(dayjs(selectedDate).diff(availableSlots[availableSlots.length - 1], "day")) + addonDays;

  // I would expect isEmbed to be not needed here as it's handled in derived variable layout, but somehow removing it breaks the views.
  const defaultLayout = isEmbed
    ? validateLayout(embedUiConfig.layout) || bookerLayouts.defaultLayout
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
    bookingUid,
    bookingData,
    layout: defaultLayout,
    isTeamEvent,
    org: entity.orgSlug,
    durationConfig,
  });

  useEffect(() => {
    if (isMobile && layout !== "mobile") {
      setLayout("mobile");
    } else if (!isMobile && layout === "mobile") {
      setLayout(defaultLayout);
    }
  }, [isMobile, setLayout, layout, defaultLayout]);

  //setting layout from query param
  useEffect(() => {
    const layout = getQueryParam("layout") as BookerLayouts;
    if (
      !isMobile &&
      !isEmbed &&
      validateLayout(layout) &&
      bookerLayouts?.enabledLayouts?.length &&
      layout !== _layout
    ) {
      const validLayout = bookerLayouts.enabledLayouts.find((userLayout) => userLayout === layout);
      validLayout && setLayout(validLayout);
    }
  }, [bookerLayouts, validateLayout, setLayout, _layout]);

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

  const hideEventTypeDetails = isEmbed ? embedUiConfig.hideEventTypeDetails : false;

  if (entity.isUnpublished) {
    return <UnpublishedEntity {...entity} />;
  }

  if (event.isSuccess && !event.data) {
    return <NotFound />;
  }

  // In Embed, a Dialog doesn't look good, we disable it intentionally for the layouts that support showing Form without Dialog(i.e. no-dialog Form)
  const shouldShowFormInDialogMap: Record<BookerLayout, boolean> = {
    // mobile supports showing the Form without Dialog
    mobile: !isEmbed,
    // We don't show Dialog in month_view currently. Can be easily toggled though as it supports no-dialog Form
    month_view: false,
    // week_view doesn't support no-dialog Form
    // When it's supported, disable it for embed
    week_view: true,
    // column_view doesn't support no-dialog Form
    // When it's supported, disable it for embed
    column_view: true,
  };

  const shouldShowFormInDialog = shouldShowFormInDialogMap[layout];

  if (bookerState === "loading") {
    return null;
  }

  return (
    <>
      {event.data ? <BookingPageTagManager eventType={event.data} /> : null}
      <div
        className={classNames(
          // In a popup embed, if someone clicks outside the main(having main class or main tag), it closes the embed
          "main",
          "text-default flex min-h-full w-full flex-col items-center",
          layout === BookerLayouts.MONTH_VIEW ? "overflow-visible" : "overflow-clip"
        )}>
        <div
          ref={animationScope}
          className={classNames(
            // Sets booker size css variables for the size of all the columns.
            ...getBookerSizeClassNames(layout, bookerState, hideEventTypeDetails),
            "bg-default dark:bg-muted grid max-w-full items-start dark:[color-scheme:dark] sm:transition-[width] sm:duration-300 sm:motion-reduce:transition-none md:flex-row",
            // We remove border only when the content covers entire viewport. Because in embed, it can almost never be the case that it covers entire viewport, we show the border there
            (layout === BookerLayouts.MONTH_VIEW || isEmbed) && "border-subtle rounded-md border",
            !isEmbed && "sm:transition-[width] sm:duration-300",
            isEmbed && layout === BookerLayouts.MONTH_VIEW && "border-booker sm:border-booker-width",
            !isEmbed && layout === BookerLayouts.MONTH_VIEW && "border-subtle"
          )}>
          <AnimatePresence>
            <BookerSection
              area="header"
              className={classNames(
                layout === BookerLayouts.MONTH_VIEW && "fixed top-4 z-10 ltr:right-4 rtl:left-4",
                (layout === BookerLayouts.COLUMN_VIEW || layout === BookerLayouts.WEEK_VIEW) &&
                  "bg-default dark:bg-muted sticky top-0 z-10"
              )}>
              <Header
                username={username}
                eventSlug={eventSlug}
                enabledLayouts={bookerLayouts.enabledLayouts}
                extraDays={layout === BookerLayouts.COLUMN_VIEW ? columnViewExtraDays.current : extraDays}
                isMobile={isMobile}
                nextSlots={nextSlots}
              />
            </BookerSection>
            <StickyOnDesktop
              key="meta"
              className={classNames(
                "relative z-10 flex [grid-area:meta]",
                // Important: In Embed if we make min-height:100vh, it will cause the height to continuously keep on increasing
                layout !== BookerLayouts.MONTH_VIEW && !isEmbed && "sm:min-h-screen"
              )}>
              <BookerSection
                area="meta"
                className="max-w-screen flex w-full flex-col md:w-[var(--booker-meta-width)]">
                <EventMeta />
                {layout !== BookerLayouts.MONTH_VIEW &&
                  !(layout === "mobile" && bookerState === "booking") && (
                    <div className="mt-auto px-5 py-3 ">
                      <DatePicker />
                    </div>
                  )}
              </BookerSection>
            </StickyOnDesktop>

            <BookerSection
              key="book-event-form"
              area="main"
              className="border-subtle sticky top-0 ml-[-1px] h-full p-6 md:w-[var(--booker-main-width)] md:border-l"
              {...fadeInLeft}
              visible={bookerState === "booking" && !shouldShowFormInDialog}>
              <BookEventForm
                onCancel={() => {
                  setSelectedTimeslot(null);
                  if (seatedEventData.bookingUid) {
                    setSeatedEventData({ ...seatedEventData, bookingUid: undefined, attendees: undefined });
                  }
                }}
                hashedLink={hashedLink}
              />
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
                "border-subtle rtl:border-default flex h-full w-full flex-col overflow-x-auto px-5 py-3 pb-0 rtl:border-r ltr:md:border-l",
                layout === BookerLayouts.MONTH_VIEW &&
                  "h-full overflow-hidden md:w-[var(--booker-timeslots-width)]",
                layout !== BookerLayouts.MONTH_VIEW && "sticky top-0"
              )}
              ref={timeslotsRef}
              {...fadeInLeft}>
              <AvailableTimeSlots
                extraDays={extraDays}
                limitHeight={layout === BookerLayouts.MONTH_VIEW}
                prefetchNextMonth={prefetchNextMonth}
                monthCount={monthCount}
                seatsPerTimeSlot={event.data?.seatsPerTimeSlot}
                showAvailableSeatsCount={event.data?.seatsShowAvailabilityCount}
              />
            </BookerSection>
          </AnimatePresence>
        </div>

        <m.span
          key="logo"
          className={classNames(
            "-z-10 mb-6 mt-auto pt-6 [&_img]:h-[15px]",
            hasDarkBackground ? "dark" : "",
            layout === BookerLayouts.MONTH_VIEW ? "block" : "hidden"
          )}>
          {!hideBranding ? <PoweredBy logoOnly /> : null}
        </m.span>
      </div>

      <BookFormAsModal
        visible={bookerState === "booking" && shouldShowFormInDialog}
        onCancel={() => setSelectedTimeslot(null)}
      />
    </>
  );
};

export const Booker = (props: BookerProps) => {
  if (props.isAway) return <Away />;

  return (
    <LazyMotion strict features={loadFramerFeatures}>
      <BookerComponent {...props} />
    </LazyMotion>
  );
};
