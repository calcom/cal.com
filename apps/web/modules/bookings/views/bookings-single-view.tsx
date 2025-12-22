"use client";

import {
  generateRecurringInstances,
  getActualRecurringStartTime,
} from "@calid/features/modules/teams/lib/recurrenceUtil";
import { Alert } from "@calid/features/ui/components/alert";
import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon";
import { Tooltip } from "@calid/features/ui/components/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import classNames from "classnames";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { Toaster } from "sonner";
import { z } from "zod";

import BookingPageTagManager from "@calcom/app-store/BookingPageTagManager";
import type { getEventLocationValue } from "@calcom/app-store/locations";
import { getSuccessPageLocationMessage, guessEventLocationType } from "@calcom/app-store/locations";
import { getEventTypeAppData } from "@calcom/app-store/utils";
import dayjs from "@calcom/dayjs";
import {
  useEmbedNonStylesConfig,
  useIsBackgroundTransparent,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import { Price } from "@calcom/features/bookings/components/event-meta/Price";
import { SystemField, TITLE_FIELD } from "@calcom/features/bookings/lib/SystemField";
import { getCalendarLinks, CalendarLinkType } from "@calcom/lib/bookings/getCalendarLinks";
import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import { formatToLocalizedDate, formatToLocalizedTime, formatToLocalizedTimezone } from "@calcom/lib/dayjs";
import type { nameObjectSchema } from "@calcom/lib/event";
import { getEventName } from "@calcom/lib/event";
import useGetBrandingColours from "@calcom/lib/getBrandColours";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import useTheme from "@calcom/lib/hooks/useTheme";
import isSmsCalEmail from "@calcom/lib/isSmsCalEmail";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { RefundPolicy } from "@calcom/lib/payment/types";
import { getEveryFreqFor } from "@calcom/lib/recurringStrings";
import { getIs24hClockFromLocalStorage, isBrowserLocale24h } from "@calcom/lib/timeFormat";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";
import { localStorage } from "@calcom/lib/webstorage";
import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";
import { bookingMetadataSchema, eventTypeMetaDataSchemaWithTypedApps } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import type { RecurringEvent } from "@calcom/types/Calendar";
import { Avatar } from "@calcom/ui/components/avatar";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { EmailInput, TextArea } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useCalcomTheme } from "@calcom/ui/styles";
import CancelBooking from "@calcom/web/components/booking/CancelBooking";
import EventReservationSchema from "@calcom/web/components/schemas/EventReservationSchema";
import { timeZone } from "@calcom/web/lib/clock";

import type { PageProps } from "./bookings-single-view.getServerSideProps";

const stringToBoolean = z
  .string()
  .optional()
  .transform((val) => val === "true");

const querySchema = z.object({
  uid: z.string(),
  email: z.string().optional(),
  eventTypeSlug: z.string().optional(),
  cancel: stringToBoolean,
  allRemainingBookings: stringToBoolean,
  changes: stringToBoolean,
  reschedule: stringToBoolean,
  isSuccessBookingPage: stringToBoolean,
  formerTime: z.string().optional(),
  seatReferenceUid: z.string().optional(),
  rating: z.string().optional(),
  noShow: stringToBoolean,
});

const useBrandColors = ({
  brandColor,
  darkBrandColor,
}: {
  brandColor?: string | null;
  darkBrandColor?: string | null;
}) => {
  const brandTheme = useGetBrandingColours({
    lightVal: brandColor,
    darkVal: darkBrandColor,
  });
  useCalcomTheme(brandTheme);
};

export default function Success(props: PageProps) {
  const { t } = useLocale();
  const router = useRouter();
  const routerQuery = useRouterQuery();
  const pathname = usePathname();
  const searchParams = useCompatSearchParams();

  const { eventType, bookingInfo, previousBooking, requiresLoginToUpdate, rescheduledToUid } = props;

  const { bannerUrl, faviconUrl } = eventType;

  const {
    allRemainingBookings,
    isSuccessBookingPage,
    cancel: isCancellationMode,
    formerTime,
    email,
    seatReferenceUid,
    noShow,
    rating,
  } = querySchema.parse(routerQuery);

  const attendeeTimeZone = bookingInfo?.attendees.find((attendee) => attendee.email === email)?.timeZone;

  const isFeedbackMode = !!(noShow || rating);
  const tz = props.tz ? props.tz : isSuccessBookingPage && attendeeTimeZone ? attendeeTimeZone : timeZone();

  const location = bookingInfo.location as ReturnType<typeof getEventLocationValue>;
  let rescheduleLocation: string | undefined;
  if (
    typeof bookingInfo.responses?.location === "object" &&
    "optionValue" in bookingInfo.responses.location
  ) {
    rescheduleLocation = bookingInfo.responses.location.optionValue;
  }

  const parsed = bookingMetadataSchema.safeParse(bookingInfo?.metadata ?? null);
  const parsedBookingMetadata = parsed.success ? parsed.data : null;

  const bookingWithParsedMetadata = {
    ...bookingInfo,
    metadata: parsedBookingMetadata,
  };
  const locationVideoCallUrl = bookingWithParsedMetadata.metadata?.videoCallUrl;

  const status = bookingInfo?.status;
  const reschedule = bookingInfo.status === BookingStatus.ACCEPTED;
  const cancellationReason = bookingInfo.cancellationReason || bookingInfo.rejectionReason;

  const attendees = bookingInfo?.attendees;

  const isGmail = !!attendees.find((attendee) => attendee?.email?.includes("gmail.com"));

  const [is24h, setIs24h] = useState(
    props?.userTimeFormat ? props.userTimeFormat === 24 : isBrowserLocale24h()
  );
  const { data: session } = useSession();
  const isHost = props.isLoggedInUserHost;

  const [showUtmParams, setShowUtmParams] = useState(false);

  const utmParams = bookingInfo.tracking;

  const [date, setDate] = useState(dayjs.utc(bookingInfo.startTime));
  const calendarLinks = getCalendarLinks({
    booking: bookingWithParsedMetadata,
    eventType: eventType,
    t,
  });

  // TODO: We could transform the JSX to just iterate over calendarLinks and render a link for each type
  const icsLink = calendarLinks.find((link) => link.id === CalendarLinkType.ICS)?.link;
  const microsoftOfficeLink = calendarLinks.find(
    (link) => link.id === CalendarLinkType.MICROSOFT_OFFICE
  )?.link;
  const microsoftOutlookLink = calendarLinks.find(
    (link) => link.id === CalendarLinkType.MICROSOFT_OUTLOOK
  )?.link;
  const googleCalendarLink = calendarLinks.find((link) => link.id === CalendarLinkType.GOOGLE_CALENDAR)?.link;

  const isBackgroundTransparent = useIsBackgroundTransparent();
  const isEmbed = useIsEmbed();
  const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";
  const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
  const [calculatedDuration, setCalculatedDuration] = useState<number | undefined>(undefined);
  const [comment, setComment] = useState("");
  const parsedRating = rating ? parseInt(rating, 10) : 3;
  const currentUserEmail =
    searchParams?.get("rescheduledBy") ??
    searchParams?.get("cancelledBy") ??
    session?.user?.email ??
    undefined;

  const defaultRating = isNaN(parsedRating) ? 3 : parsedRating > 5 ? 5 : parsedRating < 1 ? 1 : parsedRating;
  const [rateValue, setRateValue] = useState<number>(defaultRating);
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState(false);

  const mutation = trpc.viewer.public.submitRating.useMutation({
    onSuccess: async () => {
      setIsFeedbackSubmitted(true);
      showToast("Thank you, feedback submitted", "success");
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const hostNoShowMutation = trpc.viewer.public.markHostAsNoShow.useMutation({
    onSuccess: async () => {
      showToast("Thank you, feedback submitted", "success");
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  useEffect(() => {
    if (noShow) {
      hostNoShowMutation.mutate({ bookingUid: bookingInfo.uid, noShowHost: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendFeedback = async (rating: string, comment: string) => {
    mutation.mutate({ bookingUid: bookingInfo.uid, rating: rateValue, comment: comment });
  };

  function setIsCancellationMode(value: boolean) {
    const _searchParams = new URLSearchParams(searchParams?.toString() ?? undefined);

    if (value) {
      _searchParams.set("cancel", "true");
    } else {
      if (_searchParams.get("cancel")) {
        _searchParams.delete("cancel");
      }
    }

    router.replace(`${pathname}?${_searchParams.toString()}`);
  }

  let evtName = eventType.eventName;
  if (eventType.isDynamic && bookingInfo.responses?.title) {
    evtName = bookingInfo.responses.title as string;
  }

  const eventNameObject = {
    attendeeName: bookingInfo.responses.name as z.infer<typeof nameObjectSchema> | string,
    eventType: eventType.title,
    eventName: evtName,
    host: props.profile.name || "Nameless",
    location: location,
    bookingFields: bookingInfo.responses,
    eventDuration: dayjs(bookingInfo.endTime).diff(bookingInfo.startTime, "minutes"),
    t,
  };

  const giphyAppData = getEventTypeAppData(
    {
      ...eventType,
      metadata: eventTypeMetaDataSchemaWithTypedApps.parse(eventType.metadata),
    },
    "giphy"
  );
  const giphyImage = giphyAppData?.thankYouPage;
  const isRoundRobin = eventType.schedulingType === SchedulingType.ROUND_ROBIN;

  const eventName = getEventName(eventNameObject, true);
  // Confirmation can be needed in two cases as of now
  // - Event Type has require confirmation option enabled always
  // - EventType has conditionally enabled confirmation option based on how far the booking is scheduled.
  // - It's a paid event and payment is pending.
  const needsConfirmation = bookingInfo.status === BookingStatus.PENDING && eventType.requiresConfirmation;
  const userIsOwner = !!(session?.user?.id && eventType.owner?.id === session.user.id);
  const isLoggedIn = session?.user;
  const isCancelled =
    status === "CANCELLED" ||
    status === "REJECTED" ||
    (!!seatReferenceUid &&
      !bookingInfo.seatsReferences.some((reference) => reference.referenceUid === seatReferenceUid));

  // const telemetry = useTelemetry();
  /*  useEffect(() => {
    if (top !== window) {
      //page_view will be collected automatically by _middleware.ts
      telemetry.event(telemetryEventTypes.embedView, collectPageParameters("/booking"));
    }
  }, [telemetry]); */

  useEffect(() => {
    setDate(date.tz(localStorage.getItem("timeOption.preferredTimeZone") || CURRENT_TIMEZONE));
    setIs24h(props?.userTimeFormat ? props.userTimeFormat === 24 : !!getIs24hClockFromLocalStorage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, needsConfirmation]);

  useEffect(() => {
    setCalculatedDuration(dayjs(bookingInfo.endTime).diff(dayjs(bookingInfo.startTime), "minutes"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recurringEvent = bookingWithParsedMetadata.metadata?.recurringEvent;
  const isRecurringBooking = !!recurringEvent;
  function getTitle(): string {
    const titleSuffix = isRecurringBooking ? "_recurring" : "";
    const titlePrefix = isRoundRobin ? "round_robin_" : "";
    if (isCancelled) {
      return "";
    }
    if (needsConfirmation) {
      if (props.profile.name !== null) {
        return t(`user_needs_to_confirm_or_reject_booking${titleSuffix}`, {
          user: props.profile.name,
        });
      }
      return t(`needs_to_be_confirmed_or_rejected${titleSuffix}`);
    }
    if (bookingInfo.user) {
      const isAttendee = bookingInfo.attendees.find((attendee) => attendee.email === session?.user?.email);
      const attendee = bookingInfo.attendees[0]?.name || bookingInfo.attendees[0]?.email || "Nameless";
      const host = bookingInfo.user.name || bookingInfo.user.email;
      if (isHost) {
        return t(`${titlePrefix}emailed_host_and_attendee${titleSuffix}`, {
          host,
          attendee,
          interpolation: { escapeValue: false },
        });
      }
      if (isAttendee) {
        return t(`${titlePrefix}emailed_host_and_attendee${titleSuffix}`, {
          host,
          attendee,
          interpolation: { escapeValue: false },
        });
      }
      return t(`${titlePrefix}emailed_host_and_attendee${titleSuffix}`, {
        host,
        attendee,
        interpolation: { escapeValue: false },
      });
    }
    return t(`emailed_host_and_attendee${titleSuffix}`);
  }

  // This is a weird case where the same route can be opened in booking flow as a success page or as a booking detail page from the app
  // As Booking Page it has to support configured theme, but as booking detail page it should not do any change. Let Shell.tsx handle it.
  useTheme(isSuccessBookingPage ? props.profile.theme : "system", false, false);
  useBrandColors({
    brandColor: props.profile.brandColor,
    darkBrandColor: props.profile.darkBrandColor,
  });
  const locationToDisplay = getSuccessPageLocationMessage(
    locationVideoCallUrl ? locationVideoCallUrl : location,
    t,
    bookingInfo.status
  );

  const rescheduleLocationToDisplay = getSuccessPageLocationMessage(
    rescheduleLocation ?? "",
    t,
    bookingInfo.status
  );

  const providerName = guessEventLocationType(location)?.label;
  const rescheduleProviderName = guessEventLocationType(rescheduleLocation)?.label;
  const isBookingInPast = new Date(bookingInfo.endTime) < new Date();
  const isReschedulable = !isCancelled;

  const bookingCancelledEventProps = {
    booking: bookingInfo,
    organizer: {
      name: bookingInfo?.user?.name || "Nameless",
      email: bookingInfo?.userPrimaryEmail || bookingInfo?.user?.email || "Email-less",
      timeZone: bookingInfo?.user?.timeZone,
    },
    eventType,
  };

  const needsConfirmationAndReschedulable = needsConfirmation && isReschedulable;
  const isNotAttendingSeatedEvent = isCancelled && seatReferenceUid;
  const isEventCancelled = isCancelled && !seatReferenceUid;
  const isPastBooking = isBookingInPast;
  const isRerouting = searchParams?.get("cal.rerouting") === "true";
  const isRescheduled = bookingInfo?.rescheduled;

  const canCancelOrReschedule = !eventType?.disableCancelling || !eventType?.disableRescheduling;
  const canCancelAndReschedule = !eventType?.disableCancelling && !eventType?.disableRescheduling;

  const canCancel = !eventType?.disableCancelling;
  const canReschedule = !eventType?.disableRescheduling;

  const successPageHeadline = (() => {
    if (needsConfirmationAndReschedulable) {
      return isRecurringBooking ? t("booking_submitted_recurring") : t("booking_submitted");
    }

    if (isRerouting) {
      return t("This meeting has been rerouted");
    }

    if (isNotAttendingSeatedEvent) {
      return t("no_longer_attending");
    }

    if (isRescheduled) {
      return t("your_event_has_been_rescheduled");
    }

    if (isEventCancelled) {
      return t("event_cancelled");
    }

    if (isPastBooking) {
      return t("event_is_in_the_past");
    }

    return isRecurringBooking ? t("meeting_is_scheduled_recurring") : t("meeting_is_scheduled");
  })();

  window.dataLayer = window.dataLayer || [];

  const gtmEvent = {
    event: "booking_success",
    booker_email_address: bookingInfo.user?.name,
    booker_team_id: eventType?.teamId,
    booker_id: bookingInfo.user?.id,
    booking_id: bookingInfo.uid,
  };

  window.dataLayer.push(gtmEvent);

  useEffect(() => {
    if (faviconUrl) {
      const defaultFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
      defaultFavicons.forEach((link) => link.parentNode?.removeChild(link));
    }
  }, [faviconUrl]);

  return (
    <div className={isEmbed ? "" : "bg-default -mt-2 h-screen"} data-testid="success-page">
      {!isEmbed && !isFeedbackMode && (
        <EventReservationSchema
          reservationId={bookingInfo.uid}
          eventName={eventName}
          startTime={bookingInfo.startTime}
          endTime={bookingInfo.endTime}
          organizer={bookingInfo.user}
          attendees={bookingInfo.attendees}
          location={locationToDisplay}
          description={bookingInfo.description}
          status={status}
        />
      )}
      {isLoggedIn && !isEmbed && !isFeedbackMode && (
        <div className="-mb-4 ml-4 mt-2">
          <Link
            href={isRecurringBooking ? "/bookings/recurring" : "/bookings/upcoming"}
            data-testid="back-to-bookings"
            className="hover:bg-subtle text-subtle hover:text-default mt-2 inline-flex rounded-md px-2 py-2 text-sm transition dark:hover:bg-transparent">
            <Icon name="chevron-left" className="h-5 w-5 rtl:rotate-180" /> {t("back_to_bookings")}
          </Link>
        </div>
      )}
      <BookingPageTagManager
        eventType={{ ...eventType, metadata: eventTypeMetaDataSchemaWithTypedApps.parse(eventType.metadata) }}
      />
      <main className={classNames(shouldAlignCentrally ? "mx-auto" : "", isEmbed ? "" : "max-w-4xl")}>
        <div className={classNames("overflow-y-auto", isEmbed ? "" : "z-50 ")}>
          <div
            className={classNames(
              shouldAlignCentrally ? "text-center" : "",
              "flex items-end justify-center px-4 pb-20 pt-4 sm:flex sm:p-0"
            )}>
            <div
              className={classNames(
                "main my-4 flex flex-col transition-opacity sm:my-0 ",
                isEmbed ? "" : " inset-0"
              )}
              aria-hidden="true">
              <div
                className={classNames(
                  "inline-block transform overflow-hidden rounded-lg sm:my-8 sm:max-w-xl",
                  !isBackgroundTransparent && " bg-default dark:bg-muted",
                  "px-8 pb-4 pt-5 text-left align-bottom transition-all sm:w-full sm:py-8 sm:align-middle"
                )}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline">
                {!isFeedbackMode && (
                  <>
                    <div
                      className={classNames(isRoundRobin && "relative mx-auto h-24 min-h-24 w-32 min-w-32")}>
                      {isRoundRobin && bookingInfo.user && (
                        <Avatar
                          className="mx-auto flex items-center justify-center"
                          alt={bookingInfo.user.name || bookingInfo.user.email}
                          size="xl"
                          imageSrc={`${bookingInfo.user.avatarUrl}`}
                        />
                      )}
                      {giphyImage && !needsConfirmation && isReschedulable && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={giphyImage} className="w-full rounded-lg" alt="Gif from Giphy" />
                      )}
                      <div
                        className={classNames(
                          "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
                          isRoundRobin &&
                            "border-cal-bg dark:border-cal-bg-muted absolute bottom-0 right-0 z-10 h-12 w-12 border-8",
                          !giphyImage && isReschedulable && !needsConfirmation ? "bg-green-600" : "",
                          !giphyImage && isReschedulable && needsConfirmation ? "bg-subtle" : "",
                          isCancelled ? "bg-error" : ""
                        )}>
                        {!giphyImage && !needsConfirmation && isReschedulable && (
                          <Icon name="check" className="h-6 w-6 text-white dark:text-green-400" />
                        )}
                        {needsConfirmation && isReschedulable && (
                          <Icon name="calendar" className="text-emphasis h-5 w-5" />
                        )}
                        {isCancelled && <Icon name="x" className="h-5 w-5 text-red-600 dark:text-red-200" />}
                      </div>
                    </div>
                    <div className="mb-8 mt-6 text-center last:mb-0">
                      <h3
                        className="text-emphasis text-2xl font-semibold leading-6"
                        data-testid={isCancelled ? "cancelled-headline" : ""}
                        id="modal-headline">
                        {successPageHeadline}
                      </h3>

                      <div className="mt-1">
                        <p className="text-default">{getTitle()}</p>
                      </div>
                      {props.paymentStatus &&
                        (bookingInfo.status === BookingStatus.CANCELLED ||
                          bookingInfo.status === BookingStatus.REJECTED) && (
                          <h4>
                            {!props.paymentStatus.success &&
                              !props.paymentStatus.refunded &&
                              t("booking_with_payment_cancelled")}
                            {props.paymentStatus.success &&
                              !props.paymentStatus.refunded &&
                              (() => {
                                const refundPolicy = eventType?.metadata?.apps?.stripe?.refundPolicy;
                                const refundDaysCount = eventType?.metadata?.apps?.stripe?.refundDaysCount;

                                // Handle missing team or event type owner (same in processPaymentRefund.ts)
                                if (!eventType?.teamId && !eventType?.owner) {
                                  return t("booking_with_payment_cancelled_no_refund");
                                }

                                // Handle DAYS policy with expired refund window
                                else if (refundPolicy === RefundPolicy.DAYS && refundDaysCount) {
                                  const startTime = new Date(bookingInfo.startTime);
                                  const cancelTime = new Date();
                                  const daysDiff = Math.floor(
                                    (cancelTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24)
                                  );

                                  if (daysDiff > refundDaysCount) {
                                    return t("booking_with_payment_cancelled_refund_window_expired");
                                  }
                                }
                                // Handle NEVER policy
                                else if (refundPolicy === RefundPolicy.NEVER) {
                                  return t("booking_with_payment_cancelled_no_refund");
                                }

                                // Handle ALWAYS policy
                                else {
                                  return t("booking_with_payment_cancelled_already_paid");
                                }
                              })()}
                            {props.paymentStatus.refunded && t("booking_with_payment_cancelled_refunded")}
                          </h4>
                        )}

                      <div className="border-subtle text-default mt-8 grid grid-cols-3 gap-x-4 rounded-lg border px-4 py-8 text-left shadow-lg sm:gap-x-0 rtl:text-right">
                        {(isCancelled || reschedule) && cancellationReason && (
                          <>
                            <div className="font-medium">
                              {isCancelled ? t("reason") : t("reschedule_reason")}
                            </div>
                            <div className="col-span-2 mb-6 last:mb-0">{cancellationReason}</div>
                          </>
                        )}
                        {isCancelled && bookingInfo?.cancelledBy && (
                          <>
                            <div className="font-medium">{t("cancelled_by")}</div>
                            <div className="col-span-2 mb-6 last:mb-0">
                              <p className="break-words">{bookingInfo?.cancelledBy}</p>
                            </div>
                          </>
                        )}
                        {previousBooking && (
                          <>
                            <div className="font-medium">{t("rescheduled_by")}</div>
                            <div className="col-span-2 mb-6 last:mb-0">
                              <p className="break-words">{previousBooking?.rescheduledBy}</p>
                              <Link className="text-sm underline" href={`/booking/${previousBooking?.uid}`}>
                                {t("original_booking")}
                              </Link>
                            </div>
                          </>
                        )}
                        <div className="font-medium">{t("what")}</div>
                        <div className="col-span-2 mb-6 last:mb-0" data-testid="booking-title">
                          {isRoundRobin ? bookingInfo.title : eventName}
                        </div>
                        <div className="font-medium">{t("when")}</div>
                        <div className="col-span-2 mb-6 last:mb-0">
                          {!isRecurringBooking && reschedule && !!formerTime && (
                            <p className="line-through">
                              <RecurringBookings
                                eventType={eventType}
                                duration={calculatedDuration}
                                recurringEvent={recurringEvent}
                                allRemainingBookings={isRecurringBooking ? true : allRemainingBookings}
                                date={dayjs(formerTime)}
                                is24h={is24h}
                                isCancelled={isCancelled}
                                tz={tz}
                              />
                            </p>
                          )}
                          <RecurringBookings
                            eventType={eventType}
                            duration={calculatedDuration}
                            recurringEvent={recurringEvent}
                            allRemainingBookings={isRecurringBooking ? true : allRemainingBookings}
                            date={date}
                            is24h={is24h}
                            isCancelled={isCancelled}
                            tz={tz}
                          />
                        </div>
                        {(bookingInfo?.user || bookingInfo?.attendees) && (
                          <>
                            <div className="font-medium">{t("who")}</div>
                            <div className="col-span-2 last:mb-0">
                              {bookingInfo?.user && (
                                <div className="mb-3">
                                  <div>
                                    <span data-testid="booking-host-name" className="mr-2">
                                      {bookingInfo.user.name}
                                    </span>
                                    <Badge>{t("Host")}</Badge>
                                  </div>
                                  {!bookingInfo.eventType?.hideOrganizerEmail && (
                                    <p className="text-default" data-testid="booking-host-email">
                                      {bookingInfo?.userPrimaryEmail ?? bookingInfo.user.email}
                                    </p>
                                  )}
                                </div>
                              )}
                              {bookingInfo?.attendees.map((attendee) => (
                                <div key={attendee.name + attendee.email} className="mb-3 last:mb-0">
                                  {attendee.name && (
                                    <div>
                                      <span data-testid={`attendee-name-${attendee.name}`} className="mr-2">
                                        {attendee.name}
                                      </span>
                                      {bookingInfo.paid &&
                                        bookingInfo.isASeatedBooking /* This means booking is paid and has seats as responses for seated bookings are stored in `BookingSeat` */ &&
                                        (attendee.bookingSeat?.payment?.some((p) => p.success) > 0 ? (
                                          attendee.bookingSeat.payment.some(
                                            (p) => p.success && !p.refunded
                                          ) ? (
                                            <Badge variant="success">{t("paid")}</Badge>
                                          ) : (
                                            <Badge variant="destructive">{t("refunded")}</Badge>
                                          )
                                        ) : (
                                          <Badge variant="secondary">{t("unpaid")}</Badge>
                                        ))}
                                    </div>
                                  )}

                                  {attendee.phoneNumber && (
                                    <p data-testid={`attendee-phone-${attendee.phoneNumber}`}>
                                      {attendee.phoneNumber}
                                    </p>
                                  )}
                                  {!isSmsCalEmail(attendee.email) && (
                                    <p data-testid={`attendee-email-${attendee.email}`}>{attendee.email}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                        {locationToDisplay && !isCancelled && (
                          <>
                            <div className="mt-3 font-medium">{t("where")}</div>
                            <div className="col-span-2 mt-3" data-testid="where">
                              {!rescheduleLocation || locationToDisplay === rescheduleLocationToDisplay ? (
                                <DisplayLocation
                                  locationToDisplay={locationToDisplay}
                                  providerName={providerName}
                                />
                              ) : (
                                <>
                                  {!!formerTime && (
                                    <DisplayLocation
                                      locationToDisplay={locationToDisplay}
                                      providerName={providerName}
                                      className="line-through"
                                    />
                                  )}

                                  <DisplayLocation
                                    locationToDisplay={rescheduleLocationToDisplay}
                                    providerName={rescheduleProviderName}
                                  />
                                </>
                              )}
                            </div>
                          </>
                        )}
                        {props.paymentStatus && (
                          <>
                            <div className="mt-3 font-medium">
                              {props.paymentStatus.paymentOption === "HOLD"
                                ? t("complete_your_booking")
                                : t("payment")}
                            </div>
                            <div className="col-span-2 mb-2 mt-3">
                              <Price
                                currency={props.paymentStatus.currency}
                                price={props.paymentStatus.amount}
                              />
                            </div>
                          </>
                        )}

                        {rescheduledToUid ? <RescheduledToLink rescheduledToUid={rescheduledToUid} /> : null}

                        {bookingInfo?.description && (
                          <>
                            <div className="mt-9 font-medium">{t("additional_notes")}</div>
                            <div className="col-span-2 mb-2 mt-9">
                              <p className="break-words">{bookingInfo.description}</p>
                            </div>
                          </>
                        )}
                        {!!utmParams && isHost && (
                          <>
                            <div className="mt-9 pr-2 font-medium sm:pr-0">{t("utm_params")}</div>
                            <div className="col-span-2 mb-2 ml-3 mt-9 sm:ml-0">
                              <button
                                data-testid="utm-dropdown"
                                onClick={() => {
                                  setShowUtmParams((prev) => !prev);
                                }}
                                className="font-medium transition hover:text-blue-500 focus:outline-none">
                                <div className="flex items-center gap-1">
                                  {showUtmParams ? t("hide") : t("show")}
                                  <Icon
                                    name={showUtmParams ? "chevron-up" : "chevron-down"}
                                    className="size-4"
                                  />
                                </div>
                              </button>

                              {showUtmParams && (
                                <div className="col-span-2 mb-2 mt-2">
                                  {Object.entries(utmParams).filter(([_, value]) => Boolean(value)).length >
                                  0 ? (
                                    <ul className="space-y-1 p-1 pl-5 sm:w-80">
                                      {Object.entries(utmParams)
                                        .filter(([_, value]) => Boolean(value))
                                        .map(([key, value]) => (
                                          <li key={key} className="text-muted space-x-1 text-sm">
                                            <span>{key}</span>: <span>{value}</span>
                                          </li>
                                        ))}
                                    </ul>
                                  ) : (
                                    <p className="text-muted text-sm">{t("no_utm_params")}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                        {eventType.bookingFields.map((field) => {
                          if (!field) return null;

                          if (!bookingInfo.responses[field.name]) return null;

                          const response = bookingInfo.responses[field.name];

                          const isSystemField = SystemField.safeParse(field.name);
                          if (isSystemField.success && field.name !== TITLE_FIELD) return null;

                          const label = field.label || t(field.defaultLabel);

                          return (
                            <Fragment key={field.name}>
                              <div
                                className="mt-3 font-medium"
                                // eslint-disable-next-line react/no-danger
                                dangerouslySetInnerHTML={{
                                  __html: markdownToSafeHTML(label),
                                }}
                              />
                              <div className="col-span-2 mb-6 mt-3 last:mb-0">
                                <div
                                  className="text-default break-words"
                                  data-testid="field-response"
                                  data-fob-field={field.name}>
                                  {(() => {
                                    const renderValue = (val: any) => {
                                      if (Array.isArray(val)) {
                                        if (val.length === 0) return null;
                                        if (
                                          typeof val[0] === "object" &&
                                          val[0] !== null &&
                                          "url" in val[0]
                                        ) {
                                          return (
                                            <ul className="">
                                              {val.map((item: any, i: number) => (
                                                <li key={i}>
                                                  <a
                                                    href={item.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline">
                                                    {item.name || "Attachment"}
                                                  </a>
                                                </li>
                                              ))}
                                            </ul>
                                          );
                                        }
                                        return val.join(", ");
                                      }
                                      if (typeof val === "object" && val !== null && "url" in val) {
                                        return (
                                          <a
                                            href={val.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline">
                                            {val.name || "Attachment"}
                                          </a>
                                        );
                                      }
                                      if (field.type === "boolean") {
                                        return val ? t("yes") : t("no");
                                      }
                                      return val.toString();
                                    };
                                    return renderValue(response);
                                  })()}
                                </div>
                              </div>
                            </Fragment>
                          );
                        })}
                      </div>
                      {/* <div className="text-bookingdark dark:border-darkgray-200 mt-8 text-left dark:text-gray-300 bg-red-900">
                        {eventType.bookingFields.map((field) => {
                          if (!field) return null;

                          if (!bookingInfo.responses[field.name]) return null;

                          const response = bookingInfo.responses[field.name];
                          // We show location in the "where" section
                          // We show Booker Name, Emails and guests in Who section
                          // We show notes in additional notes section
                          // We show rescheduleReason at the top

                          const isSystemField = SystemField.safeParse(field.name);
                          // SMS_REMINDER_NUMBER_FIELD is a system field but doesn't have a dedicated place in the UI. So, it would be shown through the following responses list
                          // TITLE is also an identifier for booking question "What is this meeting about?"
                          if (
                            isSystemField.success &&
                            //field.name !== SMS_REMINDER_NUMBER_FIELD &&
                            field.name !== TITLE_FIELD
                          )
                            return null;

                          const label = field.label || t(field.defaultLabel);

                          return (
                            <Fragment key={field.name}>
                              <div
                                className="text-emphasis mt-4 font-medium"
                                // eslint-disable-next-line react/no-danger
                                dangerouslySetInnerHTML={{
                                  __html: markdownToSafeHTML(label),
                                }}
                              />
                              <p
                                className="text-default break-words"
                                data-testid="field-response"
                                data-fob-field={field.name}>
                                {field.type === "boolean"
                                  ? response
                                    ? t("yes")
                                    : t("no")
                                  : response.toString()}
                              </p>
                            </Fragment>
                          );
                        })}
                      </div> */}
                    </div>
                    {requiresLoginToUpdate && (
                      <>
                        <div className="text-center">
                          <span className="text-emphasis ltr:mr-2 rtl:ml-2">
                            {t("need_to_make_a_change")}
                          </span>
                          {/* Login button but redirect to here */}
                          <span className="text-default inline">
                            <span className="underline" data-testid="reschedule-link">
                              <Link
                                href={`/auth/login?callbackUrl=${encodeURIComponent(
                                  `/booking/${bookingInfo?.uid}`
                                )}`}
                                legacyBehavior>
                                {t("login")}
                              </Link>
                            </span>
                          </span>
                        </div>
                      </>
                    )}
                    {!requiresLoginToUpdate &&
                      (!needsConfirmation || !userIsOwner) &&
                      isReschedulable &&
                      !isRerouting &&
                      canCancelOrReschedule &&
                      (!isCancellationMode ? (
                        <>
                          <div className="text-center last:pb-0">
                            <span className="text-emphasis ltr:mr-2 rtl:ml-2">
                              {t("need_to_make_a_change")}
                            </span>

                            <>
                              {!isRecurringBooking &&
                                (!isBookingInPast || eventType.allowReschedulingPastBookings) &&
                                canReschedule && (
                                  <span className="text-default inline">
                                    <span className="underline" data-testid="reschedule-link">
                                      <Link
                                        href={`/reschedule/${seatReferenceUid || bookingInfo?.uid}${
                                          currentUserEmail
                                            ? `?rescheduledBy=${encodeURIComponent(currentUserEmail)}`
                                            : ""
                                        }`}
                                        legacyBehavior>
                                        {t("reschedule")}
                                      </Link>
                                    </span>
                                    {canCancelAndReschedule && (
                                      <span className="mx-2">{t("or_lowercase")}</span>
                                    )}
                                  </span>
                                )}

                              {canCancel && (
                                <button
                                  data-testid="cancel"
                                  className={classNames(
                                    "text-default underline",
                                    isRecurringBooking && "ltr:mr-2 rtl:ml-2"
                                  )}
                                  onClick={() => setIsCancellationMode(true)}>
                                  {t("cancel")}
                                </button>
                              )}
                            </>
                          </div>
                        </>
                      ) : (
                        <>
                          <hr className="border-subtle" />
                          <CancelBooking
                            booking={{
                              uid: bookingInfo?.uid,
                              title: bookingInfo?.title,
                              id: bookingInfo?.id,
                              isPaid: props.paymentStatus !== null,
                            }}
                            profile={{ name: props.profile.name, slug: props.profile.slug }}
                            recurringEvent={recurringEvent}
                            team={eventType?.team?.name}
                            teamId={eventType?.team?.id}
                            setIsCancellationMode={setIsCancellationMode}
                            theme={isSuccessBookingPage ? props.profile.theme : "light"}
                            allRemainingBookings={isRecurringBooking ? true : allRemainingBookings}
                            seatReferenceUid={seatReferenceUid}
                            bookingCancelledEventProps={bookingCancelledEventProps}
                            currentUserEmail={currentUserEmail}
                            isHost={isHost}
                            internalNotePresets={props.internalNotePresets}
                          />
                        </>
                      ))}
                    {isRerouting && typeof window !== "undefined" && window.opener && (
                      <div className="flex justify-center">
                        <Button
                          type="button"
                          onClick={() => {
                            window.opener.focus();
                            window.close();
                          }}>
                          Go Back
                        </Button>
                      </div>
                    )}
                    {!needsConfirmation && !isCancellationMode && isReschedulable && !!calculatedDuration && (
                      <>
                        <div className="text-default align-center flex flex-row justify-center pt-4">
                          <span className="text-default flex self-center font-medium ltr:mr-2 rtl:ml-2 ">
                            {t("add_to_calendar")}
                          </span>
                          <div className="justify-left mt-1 flex text-left sm:mt-0">
                            {googleCalendarLink && (
                              <Tooltip content={t("google_calendar")}>
                                <Link
                                  href={googleCalendarLink}
                                  className="text-default hover:bg-subtle h-10 w-10 rounded-md px-3 py-2 ltr:mr-2 rtl:ml-2"
                                  target="_blank">
                                  <svg
                                    className="-mt-1.5 inline-block h-4 w-4"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 48 48">
                                    <title>Google</title>
                                    <path
                                      fill="#4285F4"
                                      d="M24 9.5c3.54 0 6.73 1.22 9.23 3.6l6.85-6.85C35.9 2.7 30.47 0 24 0 14.64 0 6.4 5.48 2.54 13.45l7.98 6.2C12.35 13.6 17.74 9.5 24 9.5z"
                                    />
                                    <path
                                      fill="#34A853"
                                      d="M46.1 24.5c0-1.57-.14-3.08-.39-4.5H24v9.01h12.45c-.54 2.89-2.18 5.34-4.65 7.01l7.47 5.8C43.59 37.17 46.1 31.34 46.1 24.5z"
                                    />
                                    <path
                                      fill="#FBBC05"
                                      d="M10.52 28.65c-.48-1.4-.75-2.9-.75-4.45s.27-3.05.75-4.45l-7.98-6.2C.9 16.85 0 20.3 0 24.2s.9 7.35 2.54 10.65l7.98-6.2z"
                                    />
                                    <path
                                      fill="#EA4335"
                                      d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.47-5.8c-2.13 1.43-4.87 2.25-8.44 2.25-6.26 0-11.65-4.1-13.48-9.95l-7.98 6.2C6.4 42.52 14.64 48 24 48z"
                                    />
                                  </svg>
                                </Link>
                              </Tooltip>
                            )}
                            {microsoftOutlookLink && (
                              <Tooltip content={t("microsoft_outlook")}>
                                <Link
                                  href={microsoftOutlookLink}
                                  className="text-default hover:bg-subtle h-10 w-10 rounded-md px-3 py-2 ltr:mr-2 rtl:ml-2"
                                  target="_blank">
                                  <svg
                                    className="-mt-1.5 mr-1 inline-block h-4 w-4"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 48 48">
                                    <title>Microsoft Outlook</title>
                                    <path
                                      fill="#0078D4"
                                      d="M41.5 6H14a2 2 0 0 0-2 2v5H8.5A2.5 2.5 0 0 0 6 15.5v17A2.5 2.5 0 0 0 8.5 35H12v5a2 2 0 0 0 2 2h27.5a2.5 2.5 0 0 0 2.5-2.5v-31A2.5 2.5 0 0 0 41.5 6z"
                                    />
                                    <path
                                      fill="#fff"
                                      d="M20 28c-2.2 0-4-2.2-4-4.9s1.8-4.9 4-4.9 4 2.2 4 4.9S22.2 28 20 28z"
                                    />
                                    <path
                                      fill="#fff"
                                      d="M20 16c-3.3 0-6 3.1-6 7s2.7 7 6 7 6-3.1 6-7-2.7-7-6-7z"
                                    />
                                  </svg>
                                </Link>
                              </Tooltip>
                            )}
                            {microsoftOfficeLink && (
                              <Tooltip content={t("microsoft_office")}>
                                <Link
                                  href={microsoftOfficeLink}
                                  className="text-default hover:bg-subtle h-10 w-10 rounded-md px-3 py-2 ltr:mr-2 rtl:ml-2"
                                  target="_blank">
                                  <svg
                                    className="-mt-1.5 mr-1 inline-block h-4 w-4"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 48 48">
                                    <title>Microsoft Office</title>
                                    <path fill="#EA3E23" d="M8 8l14-4 18 6v28l-18 6-14-4z" />
                                    <path fill="#FF6A00" d="M22 10v28l14-4V14z" />
                                    <path fill="#F35426" d="M22 10L8 8v32l14-2z" />
                                  </svg>
                                </Link>
                              </Tooltip>
                            )}
                            {icsLink && (
                              <Tooltip content={t("ics")}>
                                <Link
                                  href={icsLink}
                                  className="text-default hover:bg-subtle h-10 w-10 rounded-md px-3 py-2 ltr:mr-2 rtl:ml-2"
                                  download={`${eventType.title}.ics`}>
                                  <svg
                                    version="1.1"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 1000 1000"
                                    className="-mt-1.5 mr-1 inline-block h-4 w-4">
                                    <title>ICS</title>
                                    <path
                                      fill="#2563EB"
                                      d="M200 100h600c55 0 100 45 100 100v600c0 55-45 100-100 100H200c-55 0-100-45-100-100V200c0-55 45-100 100-100z"
                                    />
                                    <rect fill="#fff" x="250" y="300" width="500" height="400" rx="30" />
                                    <rect fill="#1E40AF" x="250" y="250" width="500" height="80" />
                                  </svg>
                                </Link>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {session === null && !(userIsOwner || props.hideBranding) && (
                      <>
                        <div className="text-default pt-8 text-center text-xs">
                          <a href="https://cal.com/signup">
                            {t("create_booking_link_with_calcom", { appName: APP_NAME })}
                          </a>

                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const target = e.target as typeof e.target & {
                                email: { value: string };
                              };
                              router.push(`${WEBAPP_URL}/signup?email=${target.email.value}`);
                            }}
                            className="mt-4 flex">
                            <EmailInput
                              name="email"
                              id="email"
                              defaultValue={email}
                              className="mr- focus:border-brand-default border-default text-default mt-0 block w-full rounded-none rounded-l-md shadow-sm focus:ring-black sm:text-sm"
                              placeholder="rick.astley@cal.id"
                            />
                            <Button
                              type="submit"
                              className="min-w-max rounded-none rounded-r-md"
                              color="primary">
                              {t("try_for_free")}
                            </Button>
                          </form>
                        </div>
                      </>
                    )}
                  </>
                )}
                {isFeedbackMode &&
                  (noShow ? (
                    <>
                      <EmptyScreen
                        Icon="user-x"
                        iconClassName="text-error"
                        iconWrapperClassName="bg-error"
                        headline={t("host_no_show")}
                        description={t("no_show_description")}
                        buttonRaw={
                          !isRecurringBooking ? (
                            <Button href={`/reschedule/${seatReferenceUid || bookingInfo?.uid}`}>
                              {t("reschedule")}
                            </Button>
                          ) : undefined
                        }
                      />
                    </>
                  ) : (
                    <>
                      <div className="my-3 flex justify-center space-x-1">
                        <button
                          className={classNames(
                            "flex h-10 w-10 items-center justify-center rounded-full border text-2xl hover:opacity-100",
                            rateValue === 1
                              ? "border-emphasis bg-emphasis"
                              : "border-muted bg-default opacity-50"
                          )}
                          disabled={isFeedbackSubmitted}
                          onClick={() => setRateValue(1)}>
                          😠
                        </button>
                        <button
                          className={classNames(
                            "flex h-10 w-10 items-center justify-center rounded-full border text-2xl hover:opacity-100",
                            rateValue === 2
                              ? "border-emphasis bg-emphasis"
                              : "border-muted bg-default opacity-50"
                          )}
                          disabled={isFeedbackSubmitted}
                          onClick={() => setRateValue(2)}>
                          🙁
                        </button>
                        <button
                          className={classNames(
                            "flex h-10 w-10 items-center justify-center rounded-full border text-2xl hover:opacity-100",
                            rateValue === 3
                              ? "border-emphasis bg-emphasis"
                              : " border-muted bg-default opacity-50"
                          )}
                          disabled={isFeedbackSubmitted}
                          onClick={() => setRateValue(3)}>
                          😐
                        </button>
                        <button
                          className={classNames(
                            "flex h-10 w-10 items-center justify-center rounded-full border text-2xl hover:opacity-100",
                            rateValue === 4
                              ? "border-emphasis bg-emphasis"
                              : "border-muted bg-default opacity-50"
                          )}
                          disabled={isFeedbackSubmitted}
                          onClick={() => setRateValue(4)}>
                          😄
                        </button>
                        <button
                          className={classNames(
                            "flex h-10 w-10 items-center justify-center rounded-full border text-2xl hover:opacity-100",
                            rateValue === 5
                              ? "border-emphasis bg-emphasis"
                              : "border-muted bg-default opacity-50"
                          )}
                          disabled={isFeedbackSubmitted}
                          onClick={() => setRateValue(5)}>
                          😍
                        </button>
                      </div>
                      <div className="my-4 space-y-1 text-center">
                        <h2 className="font-cal text-lg">{t("submitted_feedback")}</h2>
                        <p className="text-sm">{rateValue < 4 ? t("how_can_we_improve") : t("most_liked")}</p>
                      </div>
                      <TextArea
                        id="comment"
                        name="comment"
                        placeholder="Next time I would like to ..."
                        rows={3}
                        disabled={isFeedbackSubmitted}
                        onChange={(event) => setComment(event.target.value)}
                      />
                      <div className="my-4 flex justify-start">
                        <Button
                          loading={mutation.isPending}
                          disabled={isFeedbackSubmitted}
                          onClick={async () => {
                            if (rating) {
                              await sendFeedback(rating, comment);
                            }
                          }}>
                          {t("submit_feedback")}
                        </Button>
                      </div>
                    </>
                  ))}
              </div>
              {isGmail && !isFeedbackMode && (
                <Alert
                  className="main -mb-20 mt-4 inline-block sm:-mt-4 sm:mb-4 sm:w-full sm:max-w-xl sm:align-middle ltr:text-left rtl:text-right"
                  severity="warning"
                  message={
                    <div>
                      <p className="font-semibold">{t("google_new_spam_policy")}</p>
                      <span className="underline">
                        <a target="_blank" href="https://cal.id/google-spam-policy">
                          {t("resolve")}
                        </a>
                      </span>
                    </div>
                  }
                  CustomIcon="circle-alert"
                  customIconColor="text-attention dark:text-orange-200"
                />
              )}
            </div>
          </div>
        </div>
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
}

const RescheduledToLink = ({ rescheduledToUid }: { rescheduledToUid: string }) => {
  const { t } = useLocale();
  return (
    <>
      <div className="mt-3 font-medium">{t("rescheduled")}</div>
      <div className="col-span-2 mb-2 mt-3">
        <span className="underline">
          <Link href={`/booking/${rescheduledToUid}`}>
            <div className="flex items-center gap-1">
              {t("view_booking")}
              <Icon name="external-link" className="h-4 w-4" />
            </div>
          </Link>
        </span>
      </div>
    </>
  );
};

const DisplayLocation = ({
  locationToDisplay,
  providerName,
  className,
}: {
  locationToDisplay: string;
  providerName?: string;
  className?: string;
}) =>
  locationToDisplay.startsWith("http") ? (
    <a
      href={locationToDisplay}
      target="_blank"
      title={locationToDisplay}
      className={classNames("text-default flex items-center gap-2", className)}
      rel="noreferrer">
      {providerName || "Link"}
      <Icon name="external-link" className="text-default inline h-4 w-4" />
    </a>
  ) : (
    <p className={className}>{locationToDisplay}</p>
  );

type RecurringBookingsProps = {
  eventType: PageProps["eventType"];
  recurringEvent: RecurringEvent | undefined;
  date: dayjs.Dayjs;
  duration: number | undefined;
  is24h: boolean;
  allRemainingBookings: boolean;
  isCancelled: boolean;
  tz: string;
};

function RecurringBookings({
  eventType,
  recurringEvent,
  duration,
  date,
  allRemainingBookings,
  is24h,
  isCancelled,
  tz,
}: RecurringBookingsProps) {
  const [moreEventsVisible, setMoreEventsVisible] = useState(false);
  const {
    t,
    i18n: { language },
  } = useLocale();
  // Generate recurring instances from recurringEvent if present
  const recurringBookings =
    recurringEvent && date ? generateRecurringInstances(recurringEvent, date.toDate()) : null;
  const recurringBookingsSorted = recurringBookings
    ? recurringBookings
        .map((dateObj) => dateObj.toISOString())
        .sort((a: string, b: string) => (dayjs(a).isAfter(dayjs(b)) ? 1 : -1))
    : null;

  if (!duration) return null;

  // Show summary format for more than 10 instances
  if (recurringBookingsSorted && recurringBookingsSorted.length > 10 && allRemainingBookings) {
    const firstDate = (() => {
      // If we have a recurring event, compute the actual first occurrence
      if (recurringEvent) {
        const actualStart = getActualRecurringStartTime(recurringEvent, new Date(recurringBookingsSorted[0]));
        console.log("actualStart", actualStart);
        return actualStart;
      }
      return recurringBookingsSorted[0];
    })();
    return (
      <div className={classNames(isCancelled ? "line-through" : "")}>
        {recurringEvent?.count && (
          <div className="mb-2">
            <span className="font-medium">
              {getEveryFreqFor({
                t,
                recurringEvent,
                recurringCount: recurringEvent?.count ?? undefined,
              })}
            </span>
          </div>
        )}

        <div>
          <span className="font-medium">{t("starting")} </span>
          {formatToLocalizedDate(dayjs.tz(firstDate, tz), language, "full", tz)}
          <br />
          {formatToLocalizedTime(dayjs(firstDate), language, undefined, !is24h, tz)} -{" "}
          {formatToLocalizedTime(dayjs(firstDate).add(duration, "m"), language, undefined, !is24h, tz)}{" "}
          <span className="text-bookinglight">
            ({formatToLocalizedTimezone(dayjs(firstDate), language, tz)})
          </span>
          {recurringEvent?.rDates && recurringEvent.rDates.length > 0 && (
            <span className="text-subtle ml-1">
              <br />+ {t("additional_dates", { count: recurringEvent.rDates.length })}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Show detailed list for 10 or fewer instances
  if (recurringBookingsSorted && allRemainingBookings) {
    return (
      <>
        {recurringEvent?.count && (
          <span className="font-medium">
            {getEveryFreqFor({
              t,
              recurringEvent,
              recurringCount: recurringEvent?.count ?? undefined,
            })}
          </span>
        )}
        {recurringEvent?.count &&
          recurringBookingsSorted.slice(0, 4).map((dateStr: string, idx: number) => (
            <div key={idx} className={classNames("mb-2", isCancelled ? "line-through" : "")}>
              {formatToLocalizedDate(dayjs.tz(dateStr, tz), language, "full", tz)}
              <br />
              {formatToLocalizedTime(dayjs(dateStr), language, undefined, !is24h, tz)} -{" "}
              {formatToLocalizedTime(dayjs(dateStr).add(duration, "m"), language, undefined, !is24h, tz)}{" "}
              <span className="text-bookinglight">
                ({formatToLocalizedTimezone(dayjs(dateStr), language, tz)})
              </span>
            </div>
          ))}
        {recurringBookingsSorted.length > 4 && (
          <Collapsible open={moreEventsVisible} onOpenChange={() => setMoreEventsVisible(!moreEventsVisible)}>
            <CollapsibleTrigger
              type="button"
              className={classNames("flex w-full", moreEventsVisible ? "hidden" : "")}>
              + {t("plus_more", { count: recurringBookingsSorted.length - 4 })}
            </CollapsibleTrigger>
            <CollapsibleContent>
              {recurringEvent?.count &&
                recurringBookingsSorted.slice(4).map((dateStr: string, idx: number) => (
                  <div key={idx} className={classNames("mb-2", isCancelled ? "line-through" : "")}>
                    {formatToLocalizedDate(dayjs.tz(dateStr, tz), language, "full", tz)}
                    <br />
                    {formatToLocalizedTime(dayjs(dateStr), language, undefined, !is24h, tz)} -{" "}
                    {formatToLocalizedTime(
                      dayjs(dateStr).add(duration, "m"),
                      language,
                      undefined,
                      !is24h,
                      tz
                    )}{" "}
                    <span className="text-bookinglight">
                      ({formatToLocalizedTimezone(dayjs(dateStr), language, tz)})
                    </span>
                  </div>
                ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </>
    );
  }

  // Single booking fallback
  return (
    <div className={classNames(isCancelled ? "line-through" : "")}>
      {formatToLocalizedDate(date, language, "full", tz)}
      <br />
      {formatToLocalizedTime(date, language, undefined, !is24h, tz)} -{" "}
      {formatToLocalizedTime(dayjs(date).add(duration, "m"), language, undefined, !is24h, tz)}{" "}
      <span className="text-bookinglight">({formatToLocalizedTimezone(date, language, tz)})</span>
    </div>
  );
}
