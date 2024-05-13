import { LazyMotion, m, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useRef, useMemo } from "react";
import StickyBox from "react-sticky-box";
import { shallow } from "zustand/shallow";

import BookingPageTagManager from "@calcom/app-store/BookingPageTagManager";
import dayjs from "@calcom/dayjs";
import { getQueryParam } from "@calcom/features/bookings/Booker/utils/query-param";
import { useNonEmptyScheduleDays } from "@calcom/features/schedules";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookerLayouts } from "@calcom/prisma/zod-utils";

import { VerifyCodeDialog } from "../components/VerifyCodeDialog";
import { AvailableTimeSlots } from "./components/AvailableTimeSlots";
import { BookEventForm } from "./components/BookEventForm";
import { BookFormAsModal } from "./components/BookEventForm/BookFormAsModal";
import { EventMeta } from "./components/EventMeta";
import { HavingTroubleFindingTime } from "./components/HavingTroubleFindingTime";
import { Header } from "./components/Header";
import { InstantBooking } from "./components/InstantBooking";
import { LargeCalendar } from "./components/LargeCalendar";
import { OverlayCalendar } from "./components/OverlayCalendar/OverlayCalendar";
import { RedirectToInstantMeetingModal } from "./components/RedirectToInstantMeetingModal";
import { BookerSection } from "./components/Section";
import { NotFound } from "./components/Unavailable";
import { fadeInLeft, getBookerSizeClassNames, useBookerResizeAnimation } from "./config";
import { useBookerStore } from "./store";
import type { BookerProps, WrappedBookerProps } from "./types";

const loadFramerFeatures = () => import("./framer-features").then((res) => res.default);
const PoweredBy = dynamic(() => import("@calcom/ee/components/PoweredBy"));
const UnpublishedEntity = dynamic(() =>
  import("@calcom/ui/components/unpublished-entity/UnpublishedEntity").then((mod) => mod.UnpublishedEntity)
);
const DatePicker = dynamic(() => import("./components/DatePicker").then((mod) => mod.DatePicker), {
  ssr: false,
});

const BookerComponent = ({
  username,
  eventSlug,
  hideBranding = false,
  entity,
  isInstantMeeting = false,
  onGoBackInstantMeeting,
  onConnectNowInstantMeeting,
  onOverlayClickNoCalendar,
  onClickOverlayContinue,
  onOverlaySwitchStateChange,
  sessionUsername,
  rescheduleUid,
  hasSession,
  extraOptions,
  bookings,
  verifyEmail,
  slots,
  calendars,
  bookerForm,
  event,
  bookerLayout,
  schedule,
  verifyCode,
  isPlatform,
  orgBannerUrl,
  customClassNames,
}: BookerProps & WrappedBookerProps) => {
  const { t } = useLocale();
  const [bookerState, setBookerState] = useBookerStore((state) => [state.state, state.setState], shallow);
  const selectedDate = useBookerStore((state) => state.selectedDate);
  const {
    shouldShowFormInDialog,
    hasDarkBackground,
    extraDays,
    columnViewExtraDays,
    isMobile,
    layout,
    hideEventTypeDetails,
    isEmbed,
    bookerLayouts,
  } = bookerLayout;

  const [seatedEventData, setSeatedEventData] = useBookerStore(
    (state) => [state.seatedEventData, state.setSeatedEventData],
    shallow
  );
  const { selectedTimeslot, setSelectedTimeslot } = slots;

  const [dayCount, setDayCount] = useBookerStore((state) => [state.dayCount, state.setDayCount], shallow);

  const nonEmptyScheduleDays = useNonEmptyScheduleDays(schedule?.data?.slots).filter(
    (slot) => dayjs(selectedDate).diff(slot, "day") <= 0
  );

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

  const nextSlots =
    Math.abs(dayjs(selectedDate).diff(availableSlots[availableSlots.length - 1], "day")) + addonDays;

  const animationScope = useBookerResizeAnimation(layout, bookerState);

  const timeslotsRef = useRef<HTMLDivElement>(null);
  const StickyOnDesktop = isMobile ? "div" : StickyBox;

  const { bookerFormErrorRef, key, formEmail, bookingForm, errors: formErrors } = bookerForm;

  const { handleBookEvent, errors, loadingStates, expiryTime, instantVideoMeetingUrl } = bookings;

  const {
    isEmailVerificationModalVisible,
    setEmailVerificationModalVisible,
    handleVerifyEmail,
    renderConfirmNotVerifyEmailButtonCond,
  } = verifyEmail;

  const {
    overlayBusyDates,
    isOverlayCalendarEnabled,
    connectedCalendars,
    loadingConnectedCalendar,
    onToggleCalendar,
  } = calendars;

  useEffect(() => {
    if (event.isPending) return setBookerState("loading");
    if (!selectedDate) return setBookerState("selecting_date");
    if (!selectedTimeslot) return setBookerState("selecting_time");
    return setBookerState("booking");
  }, [event, selectedDate, selectedTimeslot, setBookerState]);

  const slot = getQueryParam("slot");
  useEffect(() => {
    setSelectedTimeslot(slot || null);
  }, [slot, setSelectedTimeslot]);
  const EventBooker = useMemo(() => {
    return bookerState === "booking" ? (
      <BookEventForm
        key={key}
        onCancel={() => {
          setSelectedTimeslot(null);
          if (seatedEventData.bookingUid) {
            setSeatedEventData({ ...seatedEventData, bookingUid: undefined, attendees: undefined });
          }
        }}
        onSubmit={renderConfirmNotVerifyEmailButtonCond ? handleBookEvent : handleVerifyEmail}
        errorRef={bookerFormErrorRef}
        errors={{ ...formErrors, ...errors }}
        loadingStates={loadingStates}
        renderConfirmNotVerifyEmailButtonCond={renderConfirmNotVerifyEmailButtonCond}
        bookingForm={bookingForm}
        eventQuery={event}
        extraOptions={extraOptions}
        rescheduleUid={rescheduleUid}
        isPlatform={isPlatform}>
        <>
          {verifyCode ? (
            <VerifyCodeDialog
              isOpenDialog={isEmailVerificationModalVisible}
              setIsOpenDialog={setEmailVerificationModalVisible}
              email={formEmail}
              isUserSessionRequiredToVerify={false}
              verifyCodeWithSessionNotRequired={verifyCode.verifyCodeWithSessionNotRequired}
              verifyCodeWithSessionRequired={verifyCode.verifyCodeWithSessionRequired}
              error={verifyCode.error}
              resetErrors={verifyCode.resetErrors}
              isPending={verifyCode.isPending}
              setIsPending={verifyCode.setIsPending}
            />
          ) : (
            <></>
          )}
          {!isPlatform && (
            <RedirectToInstantMeetingModal
              expiryTime={expiryTime}
              bookingId={parseInt(getQueryParam("bookingId") || "0")}
              instantVideoMeetingUrl={instantVideoMeetingUrl}
              onGoBack={() => {
                onGoBackInstantMeeting();
              }}
            />
          )}
        </>
      </BookEventForm>
    ) : (
      <></>
    );
  }, [
    bookerFormErrorRef,
    instantVideoMeetingUrl,
    bookerState,
    bookingForm,
    errors,
    event,
    expiryTime,
    extraOptions,
    formEmail,
    formErrors,
    handleBookEvent,
    handleVerifyEmail,
    isEmailVerificationModalVisible,
    key,
    loadingStates,
    onGoBackInstantMeeting,
    renderConfirmNotVerifyEmailButtonCond,
    rescheduleUid,
    seatedEventData,
    setEmailVerificationModalVisible,
    setSeatedEventData,
    setSelectedTimeslot,
    verifyCode?.error,
    verifyCode?.isPending,
    verifyCode?.resetErrors,
    verifyCode?.setIsPending,
    verifyCode?.verifyCodeWithSessionNotRequired,
    verifyCode?.verifyCodeWithSessionRequired,
    isPlatform,
  ]);

  /**
   * Unpublished organization handling - Below
   * - Reschedule links in email are of the organization event for an unpublished org, so we need to allow rescheduling unpublished event
   * - Ideally, we should allow rescheduling only for the event that has an old link(non-org link) but that's a bit complex and we are fine showing all reschedule links on unpublished organization
   */
  const considerUnpublished = entity.considerUnpublished && !rescheduleUid;

  if (considerUnpublished) {
    return <UnpublishedEntity {...entity} />;
  }

  if (event.isSuccess && !event.data) {
    return <NotFound />;
  }

  if (bookerState === "loading") {
    return null;
  }

  return (
    <>
      {event.data && !isPlatform ? <BookingPageTagManager eventType={event.data} /> : <></>}

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
            ...getBookerSizeClassNames(layout, bookerState, hideEventTypeDetails),
            `bg-default dark:bg-muted grid max-w-full items-start dark:[color-scheme:dark] sm:transition-[width] sm:duration-300 sm:motion-reduce:transition-none md:flex-row`,
            // We remove border only when the content covers entire viewport. Because in embed, it can almost never be the case that it covers entire viewport, we show the border there
            (layout === BookerLayouts.MONTH_VIEW || isEmbed) && "border-subtle rounded-md",
            !isEmbed && "sm:transition-[width] sm:duration-300",
            isEmbed && layout === BookerLayouts.MONTH_VIEW && "border-booker sm:border-booker-width",
            !isEmbed && layout === BookerLayouts.MONTH_VIEW && `border-subtle`,
            `${customClassNames?.bookerContainer}`
          )}>
          <AnimatePresence>
            {!isInstantMeeting && (
              <BookerSection
                area="header"
                className={classNames(
                  layout === BookerLayouts.MONTH_VIEW && "fixed top-4 z-10 ltr:right-4 rtl:left-4",
                  (layout === BookerLayouts.COLUMN_VIEW || layout === BookerLayouts.WEEK_VIEW) &&
                    "bg-default dark:bg-muted sticky top-0 z-10"
                )}>
                {!isPlatform ? (
                  <Header
                    isMyLink={Boolean(username === sessionUsername)}
                    eventSlug={eventSlug}
                    enabledLayouts={bookerLayouts.enabledLayouts}
                    extraDays={layout === BookerLayouts.COLUMN_VIEW ? columnViewExtraDays.current : extraDays}
                    isMobile={isMobile}
                    nextSlots={nextSlots}
                    renderOverlay={() =>
                      isEmbed ? (
                        <></>
                      ) : (
                        <>
                          <OverlayCalendar
                            isOverlayCalendarEnabled={isOverlayCalendarEnabled}
                            connectedCalendars={connectedCalendars}
                            loadingConnectedCalendar={loadingConnectedCalendar}
                            overlayBusyDates={overlayBusyDates}
                            onToggleCalendar={onToggleCalendar}
                            hasSession={hasSession}
                            handleClickContinue={onClickOverlayContinue}
                            handleSwitchStateChange={onOverlaySwitchStateChange}
                            handleClickNoCalendar={() => {
                              onOverlayClickNoCalendar();
                            }}
                          />
                        </>
                      )
                    }
                  />
                ) : (
                  <></>
                )}
              </BookerSection>
            )}
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
                {!hideEventTypeDetails && orgBannerUrl && !isPlatform && (
                  <img
                    loading="eager"
                    className="-mb-9 h-28 max-h-28 rounded-tl-md sm:max-h-24"
                    alt="org banner"
                    src={orgBannerUrl}
                  />
                )}
                <EventMeta
                  classNames={{
                    eventMetaContainer: customClassNames?.eventMetaCustomClassNames?.eventMetaContainer,
                    eventMetaTitle: customClassNames?.eventMetaCustomClassNames?.eventMetaTitle,
                    eventMetaTimezoneSelect:
                      customClassNames?.eventMetaCustomClassNames?.eventMetaTimezoneSelect,
                  }}
                  event={event.data}
                  isPending={event.isPending}
                  isPlatform={isPlatform}
                />
                {layout !== BookerLayouts.MONTH_VIEW &&
                  !(layout === "mobile" && bookerState === "booking") && (
                    <div className="mt-auto px-5 py-3 ">
                      <DatePicker event={event} schedule={schedule} />
                    </div>
                  )}
              </BookerSection>
            </StickyOnDesktop>

            <BookerSection
              key="book-event-form"
              area="main"
              className="sticky top-0 ml-[-1px] h-full p-6 md:w-[var(--booker-main-width)] md:border-l"
              {...fadeInLeft}
              visible={bookerState === "booking" && !shouldShowFormInDialog}>
              {EventBooker}
            </BookerSection>

            <BookerSection
              key="datepicker"
              area="main"
              visible={bookerState !== "booking" && layout === BookerLayouts.MONTH_VIEW}
              {...fadeInLeft}
              initial="visible"
              className="md:border-subtle ml-[-1px] h-full flex-shrink px-5 py-3 md:border-l lg:w-[var(--booker-main-width)]">
              <DatePicker
                classNames={{
                  datePickerContainer: customClassNames?.datePickerCustomClassNames?.datePickerContainer,
                  datePickerTitle: customClassNames?.datePickerCustomClassNames?.datePickerTitle,
                  datePickerDays: customClassNames?.datePickerCustomClassNames?.datePickerDays,
                  datePickerDate: customClassNames?.datePickerCustomClassNames?.datePickerDate,
                  datePickerDatesActive: customClassNames?.datePickerCustomClassNames?.datePickerDatesActive,
                  datePickerToggle: customClassNames?.datePickerCustomClassNames?.datePickerToggle,
                }}
                event={event}
                schedule={schedule}
              />
            </BookerSection>

            <BookerSection
              key="large-calendar"
              area="main"
              visible={layout === BookerLayouts.WEEK_VIEW}
              className="border-subtle sticky top-0 ml-[-1px] h-full md:border-l"
              {...fadeInLeft}>
              <LargeCalendar
                extraDays={extraDays}
                schedule={schedule.data}
                isLoading={schedule.isPending}
                event={event}
              />
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
                customClassNames={customClassNames?.availableTimeSlotsCustomClassNames}
                extraDays={extraDays}
                limitHeight={layout === BookerLayouts.MONTH_VIEW}
                schedule={schedule?.data}
                isLoading={schedule.isPending}
                seatsPerTimeSlot={event.data?.seatsPerTimeSlot}
                showAvailableSeatsCount={event.data?.seatsShowAvailabilityCount}
                event={event}
              />
            </BookerSection>
          </AnimatePresence>
        </div>
        <HavingTroubleFindingTime
          visible={bookerState !== "booking" && layout === BookerLayouts.MONTH_VIEW && !isMobile}
          dayCount={dayCount}
          isScheduleLoading={schedule.isLoading}
          onButtonClick={() => {
            setDayCount(null);
          }}
        />

        {bookerState !== "booking" && event.data?.isInstantEvent && (
          <div
            className={classNames(
              "animate-fade-in-up  z-40 my-2 opacity-0",
              layout === BookerLayouts.MONTH_VIEW && isEmbed ? "" : "fixed bottom-2"
            )}
            style={{ animationDelay: "1s" }}>
            <InstantBooking
              event={event.data}
              onConnectNow={() => {
                onConnectNowInstantMeeting();
              }}
            />
          </div>
        )}
        {!hideBranding && !isPlatform && (
          <m.span
            key="logo"
            className={classNames(
              "-z-10 mb-6 mt-auto pt-6 [&_img]:h-[15px]",
              hasDarkBackground ? "dark" : "",
              layout === BookerLayouts.MONTH_VIEW ? "block" : "hidden"
            )}>
            <PoweredBy logoOnly />
          </m.span>
        )}
      </div>

      <BookFormAsModal
        onCancel={() => setSelectedTimeslot(null)}
        visible={bookerState === "booking" && shouldShowFormInDialog}>
        {EventBooker}
      </BookFormAsModal>
    </>
  );
};

export const Booker = (props: BookerProps & WrappedBookerProps) => {
  return (
    <LazyMotion strict features={loadFramerFeatures}>
      <BookerComponent {...props} />
    </LazyMotion>
  );
};
