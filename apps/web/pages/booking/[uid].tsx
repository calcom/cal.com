import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import classNames from "classnames";
import { createEvent } from "ics";
import type { GetServerSidePropsContext } from "next";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { RRule } from "rrule";
import { z } from "zod";

import BookingPageTagManager from "@calcom/app-store/BookingPageTagManager";
import type { getEventLocationValue } from "@calcom/app-store/locations";
import { getSuccessPageLocationMessage, guessEventLocationType } from "@calcom/app-store/locations";
import { getEventTypeAppData } from "@calcom/app-store/utils";
import { getEventName } from "@calcom/core/event";
import type { ConfigType } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import {
  sdkActionManager,
  useEmbedNonStylesConfig,
  useIsBackgroundTransparent,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getBookingWithResponses } from "@calcom/features/bookings/lib/get-booking";
import {
  SystemField,
  getBookingFieldsWithSystemFields,
  SMS_REMINDER_NUMBER_FIELD,
} from "@calcom/features/bookings/lib/getBookingFields";
import { parseRecurringEvent } from "@calcom/lib";
import { APP_NAME } from "@calcom/lib/constants";
import {
  formatToLocalizedDate,
  formatToLocalizedTime,
  formatToLocalizedTimezone,
} from "@calcom/lib/date-fns";
import { getDefaultEvent } from "@calcom/lib/defaultEvents";
import useGetBrandingColours from "@calcom/lib/getBrandColours";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { getEveryFreqFor } from "@calcom/lib/recurringStrings";
import { maybeGetBookingUidFromSeat } from "@calcom/lib/server/maybeGetBookingUidFromSeat";
import { getIs24hClockFromLocalStorage, isBrowserLocale24h } from "@calcom/lib/timeFormat";
import { localStorage } from "@calcom/lib/webstorage";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import { customInputSchema, EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { Button, EmailInput, HeadSeo, Badge, useCalcomTheme } from "@calcom/ui";
import { X, ExternalLink, ChevronLeft, Check, Calendar } from "@calcom/ui/components/icon";

import { timeZone } from "@lib/clock";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

import PageWrapper from "@components/PageWrapper";
import CancelBooking from "@components/booking/CancelBooking";
import EventReservationSchema from "@components/schemas/EventReservationSchema";

import { ssrInit } from "@server/lib/ssr";

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

type SuccessProps = inferSSRProps<typeof getServerSideProps>;

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
});

export default function Success(props: SuccessProps) {
  const { t } = useLocale();
  const router = useRouter();
  const {
    allRemainingBookings,
    isSuccessBookingPage,
    cancel: isCancellationMode,
    changes,
    formerTime,
    email,
    seatReferenceUid,
  } = querySchema.parse(router.query);

  const attendeeTimeZone = props?.bookingInfo?.attendees.find(
    (attendee) => attendee.email === email
  )?.timeZone;
  const tz = isSuccessBookingPage && attendeeTimeZone ? attendeeTimeZone : props.tz ? props.tz : timeZone();

  const location = props.bookingInfo.location as ReturnType<typeof getEventLocationValue>;

  const locationVideoCallUrl: string | undefined = bookingMetadataSchema.parse(
    props?.bookingInfo?.metadata || {}
  )?.videoCallUrl;

  const status = props.bookingInfo?.status;
  const reschedule = props.bookingInfo.status === BookingStatus.ACCEPTED;
  const cancellationReason = props.bookingInfo.cancellationReason || props.bookingInfo.rejectionReason;

  const attendeeName =
    typeof props?.bookingInfo?.attendees?.[0]?.name === "string"
      ? props?.bookingInfo?.attendees?.[0]?.name
      : "Nameless";

  const [is24h, setIs24h] = useState(isBrowserLocale24h());
  const { data: session } = useSession();

  const [date, setDate] = useState(dayjs.utc(props.bookingInfo.startTime));
  const { eventType, bookingInfo } = props;

  const isBackgroundTransparent = useIsBackgroundTransparent();
  const isEmbed = useIsEmbed();
  const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";
  const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
  const [calculatedDuration, setCalculatedDuration] = useState<number | undefined>(undefined);

  function setIsCancellationMode(value: boolean) {
    const query_ = { ...router.query };

    if (value) {
      query_.cancel = "true";
    } else {
      if (query_.cancel) {
        delete query_.cancel;
      }
    }

    router.replace(
      {
        pathname: router.pathname,
        query: { ...query_ },
      },
      undefined,
      { scroll: false }
    );
  }

  const eventNameObject = {
    attendeeName,
    eventType: props.eventType.title,
    eventName: (props.dynamicEventName as string) || props.eventType.eventName,
    host: props.profile.name || "Nameless",
    location: location,
    bookingFields: bookingInfo.responses,
    t,
  };

  const giphyAppData = getEventTypeAppData(eventType, "giphy");
  const giphyImage = giphyAppData?.thankYouPage;

  const eventName = getEventName(eventNameObject, true);
  // Confirmation can be needed in two cases as of now
  // - Event Type has require confirmation option enabled always
  // - EventType has conditionally enabled confirmation option based on how far the booking is scheduled.
  // - It's a paid event and payment is pending.
  const needsConfirmation = bookingInfo.status === BookingStatus.PENDING && eventType.requiresConfirmation;
  const userIsOwner = !!(session?.user?.id && eventType.owner?.id === session.user.id);

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
    const users = eventType.users;
    if (!sdkActionManager) return;
    // TODO: We should probably make it consistent with Webhook payload. Some data is not available here, as and when requirement comes we can add
    sdkActionManager.fire("bookingSuccessful", {
      booking: bookingInfo,
      eventType,
      date: date.toString(),
      duration: calculatedDuration,
      organizer: {
        name: users[0].name || "Nameless",
        email: users[0].email || "Email-less",
        timeZone: users[0].timeZone,
      },
      confirmed: !needsConfirmation,
      // TODO: Add payment details
    });
    setDate(date.tz(localStorage.getItem("timeOption.preferredTimeZone") || dayjs.tz.guess()));
    setIs24h(!!getIs24hClockFromLocalStorage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, needsConfirmation]);

  useEffect(() => {
    setCalculatedDuration(
      dayjs(props.bookingInfo.endTime).diff(dayjs(props.bookingInfo.startTime), "minutes")
    );
  }, []);

  function eventLink(): string {
    const optional: { location?: string } = {};
    if (locationVideoCallUrl) {
      optional["location"] = locationVideoCallUrl;
    }

    const event = createEvent({
      start: [
        date.toDate().getUTCFullYear(),
        (date.toDate().getUTCMonth() as number) + 1,
        date.toDate().getUTCDate(),
        date.toDate().getUTCHours(),
        date.toDate().getUTCMinutes(),
      ],
      startInputType: "utc",
      title: eventName,
      description: props.eventType.description ? props.eventType.description : undefined,
      /** formatted to required type of description ^ */
      duration: {
        minutes: calculatedDuration,
      },
      ...optional,
    });

    if (event.error) {
      throw event.error;
    }

    return encodeURIComponent(event.value ? event.value : false);
  }

  function getTitle(): string {
    const titleSuffix = props.recurringBookings ? "_recurring" : "";
    if (isCancelled) {
      return "";
    }
    if (needsConfirmation) {
      if (props.profile.name !== null) {
        return t("user_needs_to_confirm_or_reject_booking" + titleSuffix, {
          user: props.profile.name,
        });
      }
      return t("needs_to_be_confirmed_or_rejected" + titleSuffix);
    }
    return t("emailed_you_and_attendees" + titleSuffix);
  }

  // This is a weird case where the same route can be opened in booking flow as a success page or as a booking detail page from the app
  // As Booking Page it has to support configured theme, but as booking detail page it should not do any change. Let Shell.tsx handle it.
  useTheme(isSuccessBookingPage ? props.profile.theme : undefined);
  useBrandColors({
    brandColor: props.profile.brandColor,
    darkBrandColor: props.profile.darkBrandColor,
  });
  const title = t(
    `booking_${needsConfirmation ? "submitted" : "confirmed"}${props.recurringBookings ? "_recurring" : ""}`
  );

  const locationToDisplay = getSuccessPageLocationMessage(
    locationVideoCallUrl ? locationVideoCallUrl : location,
    t,
    bookingInfo.status
  );

  const providerName = guessEventLocationType(location)?.label;

  return (
    <div className={isEmbed ? "" : "h-screen"} data-testid="success-page">
      {!isEmbed && (
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
      {userIsOwner && !isEmbed && (
        <div className="mt-2 ml-4 -mb-4">
          <Link
            href={allRemainingBookings ? "/bookings/recurring" : "/bookings/upcoming"}
            className="hover:bg-subtle text-subtle hover:text-default mt-2 inline-flex px-1 py-2 text-sm dark:hover:bg-transparent">
            <ChevronLeft className="h-5 w-5" /> {t("back_to_bookings")}
          </Link>
        </div>
      )}
      <HeadSeo title={title} description={title} />
      <BookingPageTagManager eventType={eventType} />
      <main className={classNames(shouldAlignCentrally ? "mx-auto" : "", isEmbed ? "" : "max-w-3xl")}>
        <div className={classNames("overflow-y-auto", isEmbed ? "" : "z-50 ")}>
          <div
            className={classNames(
              shouldAlignCentrally ? "text-center" : "",
              "flex items-end justify-center px-4 pt-4 pb-20  sm:block sm:p-0"
            )}>
            <div
              className={classNames("my-4 transition-opacity sm:my-0", isEmbed ? "" : " inset-0")}
              aria-hidden="true">
              <div
                className={classNames(
                  "main inline-block transform overflow-hidden rounded-lg border sm:my-8 sm:max-w-xl",
                  !isBackgroundTransparent && " bg-default dark:bg-muted border-booker border-booker-width",
                  "px-8 pt-5 pb-4 text-left align-bottom transition-all sm:w-full sm:py-8 sm:align-middle"
                )}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline">
                <div
                  className={classNames(
                    "mx-auto flex items-center justify-center",
                    !giphyImage && !isCancelled && !needsConfirmation
                      ? "bg-success h-12 w-12 rounded-full"
                      : "",
                    !giphyImage && !isCancelled && needsConfirmation
                      ? "bg-subtle h-12 w-12 rounded-full"
                      : "",
                    isCancelled ? "bg-error h-12 w-12 rounded-full" : ""
                  )}>
                  {giphyImage && !needsConfirmation && !isCancelled && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={giphyImage} alt="Gif from Giphy" />
                  )}
                  {!giphyImage && !needsConfirmation && !isCancelled && (
                    <Check className="h-5 w-5 text-green-600" />
                  )}
                  {needsConfirmation && !isCancelled && <Calendar className="text-emphasis h-5 w-5" />}
                  {isCancelled && <X className="h-5 w-5 text-red-600" />}
                </div>
                <div className="mt-6 mb-8 text-center last:mb-0">
                  <h3
                    className="text-emphasis text-2xl font-semibold leading-6"
                    data-testid={isCancelled ? "cancelled-headline" : ""}
                    id="modal-headline">
                    {needsConfirmation && !isCancelled
                      ? props.recurringBookings
                        ? t("submitted_recurring")
                        : t("submitted")
                      : isCancelled
                      ? seatReferenceUid
                        ? t("no_longer_attending")
                        : t("event_cancelled")
                      : props.recurringBookings
                      ? t("meeting_is_scheduled_recurring")
                      : t("meeting_is_scheduled")}
                  </h3>
                  <div className="mt-3">
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
                          t("booking_with_payment_cancelled_already_paid")}
                        {props.paymentStatus.refunded && t("booking_with_payment_cancelled_refunded")}
                      </h4>
                    )}

                  <div className="border-subtle text-default mt-8 grid grid-cols-3 border-t pt-8 text-left">
                    {(isCancelled || reschedule) && cancellationReason && (
                      <>
                        <div className="font-medium">
                          {isCancelled ? t("reason") : t("reschedule_reason_success_page")}
                        </div>
                        <div className="col-span-2 mb-6 last:mb-0">{cancellationReason}</div>
                      </>
                    )}
                    <div className="font-medium">{t("what")}</div>
                    <div className="col-span-2 mb-6 last:mb-0">{props.bookingInfo.title}</div>
                    <div className="font-medium">{t("when")}</div>
                    <div className="col-span-2 mb-6 last:mb-0">
                      {reschedule && !!formerTime && (
                        <p className="line-through">
                          <RecurringBookings
                            eventType={props.eventType}
                            duration={calculatedDuration}
                            recurringBookings={props.recurringBookings}
                            allRemainingBookings={allRemainingBookings}
                            date={dayjs(formerTime)}
                            is24h={is24h}
                            isCancelled={isCancelled}
                            tz={tz}
                          />
                        </p>
                      )}
                      <RecurringBookings
                        eventType={props.eventType}
                        duration={calculatedDuration}
                        recurringBookings={props.recurringBookings}
                        allRemainingBookings={allRemainingBookings}
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
                                <span className="mr-2">{bookingInfo.user.name}</span>
                                <Badge variant="blue">{t("Host")}</Badge>
                              </div>
                              <p className="text-default">{bookingInfo.user.email}</p>
                            </div>
                          )}
                          {bookingInfo?.attendees.map((attendee) => (
                            <div key={attendee.name + attendee.email} className="mb-3 last:mb-0">
                              {attendee.name && <p>{attendee.name}</p>}
                              <p data-testid={`attendee-${attendee.email}`}>{attendee.email}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {locationToDisplay && !isCancelled && (
                      <>
                        <div className="mt-3 font-medium">{t("where")}</div>
                        <div className="col-span-2 mt-3">
                          {locationToDisplay.startsWith("http") ? (
                            <a
                              href={locationToDisplay}
                              target="_blank"
                              title={locationToDisplay}
                              className="text-default flex items-center gap-2 underline"
                              rel="noreferrer">
                              {providerName || "Link"}
                              <ExternalLink className="text-default inline h-4 w-4" />
                            </a>
                          ) : (
                            locationToDisplay
                          )}
                        </div>
                      </>
                    )}
                    {bookingInfo?.description && (
                      <>
                        <div className="mt-9 font-medium">{t("additional_notes")}</div>
                        <div className="col-span-2 mb-2 mt-9">
                          <p className="break-words">{bookingInfo.description}</p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="text-bookingdark dark:border-darkgray-200 mt-8 text-left dark:text-gray-300">
                    {Object.entries(bookingInfo.responses).map(([name, response]) => {
                      const field = eventType.bookingFields.find((field) => field.name === name);
                      // We show location in the "where" section
                      // We show Booker Name, Emails and guests in Who section
                      // We show notes in additional notes section
                      // We show rescheduleReason at the top
                      if (!field) return null;
                      const isSystemField = SystemField.safeParse(field.name);
                      // SMS_REMINDER_NUMBER_FIELD is a system field but doesn't have a dedicated place in the UI. So, it would be shown through the following responses list
                      if (isSystemField.success && field.name !== SMS_REMINDER_NUMBER_FIELD) return null;

                      const label = field.label || t(field.defaultLabel || "");

                      return (
                        <>
                          <div className="text-emphasis mt-4 font-medium">{label}</div>
                          <p
                            className="text-default break-words"
                            data-testid="field-response"
                            data-fob-field={field.name}>
                            {response.toString()}
                          </p>
                        </>
                      );
                    })}
                  </div>
                </div>
                {(!needsConfirmation || !userIsOwner) &&
                  !isCancelled &&
                  (!isCancellationMode ? (
                    <>
                      <hr className="border-subtle mb-8" />
                      <div className="text-center last:pb-0">
                        <span className="text-emphasis ltr:mr-2 rtl:ml-2">{t("need_to_make_a_change")}</span>

                        {!props.recurringBookings && (
                          <span className="text-default inline">
                            <span className="underline" data-testid="reschedule-link">
                              <Link
                                href={`/reschedule/${seatReferenceUid || bookingInfo?.uid}`}
                                legacyBehavior>
                                {t("reschedule")}
                              </Link>
                            </span>
                            <span className="mx-2">{t("or_lowercase")}</span>
                          </span>
                        )}

                        <button
                          data-testid="cancel"
                          className={classNames(
                            "text-default underline",
                            props.recurringBookings && "ltr:mr-2 rtl:ml-2"
                          )}
                          onClick={() => setIsCancellationMode(true)}>
                          {t("cancel")}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <hr className="border-subtle" />
                      <CancelBooking
                        booking={{ uid: bookingInfo?.uid, title: bookingInfo?.title, id: bookingInfo?.id }}
                        profile={{ name: props.profile.name, slug: props.profile.slug }}
                        recurringEvent={eventType.recurringEvent}
                        team={eventType?.team?.name}
                        setIsCancellationMode={setIsCancellationMode}
                        theme={isSuccessBookingPage ? props.profile.theme : "light"}
                        allRemainingBookings={allRemainingBookings}
                        seatReferenceUid={seatReferenceUid}
                      />
                    </>
                  ))}
                {userIsOwner &&
                  !needsConfirmation &&
                  !isCancellationMode &&
                  !isCancelled &&
                  !!calculatedDuration && (
                    <>
                      <hr className="border-subtle mt-8" />
                      <div className="text-default align-center flex flex-row justify-center pt-8">
                        <span className="text-default flex self-center font-medium ltr:mr-2 rtl:ml-2 ">
                          {t("add_to_calendar")}
                        </span>
                        <div className="justify-left mt-1 flex text-left sm:mt-0">
                          <Link
                            href={
                              `https://calendar.google.com/calendar/r/eventedit?dates=${date
                                .utc()
                                .format("YYYYMMDDTHHmmss[Z]")}/${date
                                .add(calculatedDuration, "minute")
                                .utc()
                                .format("YYYYMMDDTHHmmss[Z]")}&text=${eventName}&details=${
                                props.eventType.description
                              }` +
                              (typeof locationVideoCallUrl === "string"
                                ? "&location=" + encodeURIComponent(locationVideoCallUrl)
                                : "") +
                              (props.eventType.recurringEvent
                                ? "&recur=" +
                                  encodeURIComponent(new RRule(props.eventType.recurringEvent).toString())
                                : "")
                            }
                            className="text-default border-subtle h-10 w-10 rounded-sm border px-3 py-2 ltr:mr-2 rtl:ml-2">
                            <svg
                              className="-mt-1.5 inline-block h-4 w-4"
                              fill="currentColor"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24">
                              <title>Google</title>
                              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                            </svg>
                          </Link>
                          <Link
                            href={
                              encodeURI(
                                "https://outlook.live.com/calendar/0/deeplink/compose?body=" +
                                  props.eventType.description +
                                  "&enddt=" +
                                  date.add(calculatedDuration, "minute").utc().format() +
                                  "&path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&startdt=" +
                                  date.utc().format() +
                                  "&subject=" +
                                  eventName
                              ) +
                              (locationVideoCallUrl
                                ? "&location=" + encodeURIComponent(locationVideoCallUrl)
                                : "")
                            }
                            className="border-subtle text-default mx-2 h-10 w-10 rounded-sm border px-3 py-2"
                            target="_blank">
                            <svg
                              className="mr-1 -mt-1.5 inline-block h-4 w-4"
                              fill="currentColor"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24">
                              <title>Microsoft Outlook</title>
                              <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h12.9q.44 0 .75.3.3.3.3.75V10.85l1.24.72h.01q.1.07.18.18.07.12.07.25zm-6-8.25v3h3v-3zm0 4.5v3h3v-3zm0 4.5v1.83l3.05-1.83zm-5.25-9v3h3.75v-3zm0 4.5v3h3.75v-3zm0 4.5v2.03l2.41 1.5 1.34-.8v-2.73zM9 3.75V6h2l.13.01.12.04v-2.3zM5.98 15.98q.9 0 1.6-.3.7-.32 1.19-.86.48-.55.73-1.28.25-.74.25-1.61 0-.83-.25-1.55-.24-.71-.71-1.24t-1.15-.83q-.68-.3-1.55-.3-.92 0-1.64.3-.71.3-1.2.85-.5.54-.75 1.3-.25.74-.25 1.63 0 .85.26 1.56.26.72.74 1.23.48.52 1.17.81.69.3 1.56.3zM7.5 21h12.39L12 16.08V17q0 .41-.3.7-.29.3-.7.3H7.5zm15-.13v-7.24l-5.9 3.54Z" />
                            </svg>
                          </Link>
                          <Link
                            href={
                              encodeURI(
                                "https://outlook.office.com/calendar/0/deeplink/compose?body=" +
                                  props.eventType.description +
                                  "&enddt=" +
                                  date.add(calculatedDuration, "minute").utc().format() +
                                  "&path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&startdt=" +
                                  date.utc().format() +
                                  "&subject=" +
                                  eventName
                              ) +
                              (locationVideoCallUrl
                                ? "&location=" + encodeURIComponent(locationVideoCallUrl)
                                : "")
                            }
                            className="text-default border-subtle mx-2 h-10 w-10 rounded-sm border px-3 py-2"
                            target="_blank">
                            <svg
                              className="mr-1 -mt-1.5 inline-block h-4 w-4"
                              fill="currentColor"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24">
                              <title>Microsoft Office</title>
                              <path d="M21.53 4.306v15.363q0 .807-.472 1.433-.472.627-1.253.85l-6.888 1.974q-.136.037-.29.055-.156.019-.293.019-.396 0-.72-.105-.321-.106-.656-.292l-4.505-2.544q-.248-.137-.391-.366-.143-.23-.143-.515 0-.434.304-.738.304-.305.739-.305h5.831V4.964l-4.38 1.563q-.533.187-.856.658-.322.472-.322 1.03v8.078q0 .496-.248.912-.25.416-.683.651l-2.072 1.13q-.286.148-.571.148-.497 0-.844-.347-.348-.347-.348-.844V6.563q0-.62.33-1.19.328-.571.874-.881L11.07.285q.248-.136.534-.21.285-.075.57-.075.211 0 .38.031.166.031.364.093l6.888 1.899q.384.11.7.329.317.217.547.52.23.305.353.67.125.367.125.764zm-1.588 15.363V4.306q0-.273-.16-.478-.163-.204-.423-.28l-3.388-.93q-.397-.111-.794-.23-.397-.117-.794-.216v19.68l4.976-1.427q.26-.074.422-.28.161-.204.161-.477z" />
                            </svg>
                          </Link>
                          <Link
                            href={"data:text/calendar," + eventLink()}
                            className="border-subtle text-default mx-2 h-10 w-10 rounded-sm border px-3 py-2"
                            download={props.eventType.title + ".ics"}>
                            <svg
                              version="1.1"
                              fill="currentColor"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 1000 1000"
                              className="mr-1 -mt-1.5 inline-block h-4 w-4">
                              <title>{t("other")}</title>
                              <path d="M971.3,154.9c0-34.7-28.2-62.9-62.9-62.9H611.7c-1.3,0-2.6,0.1-3.9,0.2V10L28.7,87.3v823.4L607.8,990v-84.6c1.3,0.1,2.6,0.2,3.9,0.2h296.7c34.7,0,62.9-28.2,62.9-62.9V154.9z M607.8,636.1h44.6v-50.6h-44.6v-21.9h44.6v-50.6h-44.6v-92h277.9v230.2c0,3.8-3.1,7-7,7H607.8V636.1z M117.9,644.7l-50.6-2.4V397.5l50.6-2.2V644.7z M288.6,607.3c17.6,0.6,37.3-2.8,49.1-7.2l9.1,48c-11,5.1-35.6,9.9-66.9,8.3c-85.4-4.3-127.5-60.7-127.5-132.6c0-86.2,57.8-136.7,133.2-140.1c30.3-1.3,53.7,4,64.3,9.2l-12.2,48.9c-12.1-4.9-28.8-9.2-49.5-8.6c-45.3,1.2-79.5,30.1-79.5,87.4C208.8,572.2,237.8,605.7,288.6,607.3z M455.5,665.2c-32.4-1.6-63.7-11.3-79.1-20.5l12.6-50.7c16.8,9.1,42.9,18.5,70.4,19.4c30.1,1,46.3-10.7,46.3-29.3c0-17.8-14-28.1-48.8-40.6c-46.9-16.4-76.8-41.7-76.8-81.5c0-46.6,39.3-84.1,106.8-87.1c33.3-1.5,58.3,4.2,76.5,11.2l-15.4,53.3c-12.1-5.3-33.5-12.8-62.3-12c-28.3,0.8-41.9,13.6-41.9,28.1c0,17.8,16.1,25.5,53.6,39c52.9,18.5,78.4,45.3,78.4,86.4C575.6,629.7,536.2,669.2,455.5,665.2z M935.3,842.7c0,14.9-12.1,27-27,27H611.7c-1.3,0-2.6-0.2-3.9-0.4V686.2h270.9c19.2,0,34.9-15.6,34.9-34.9V398.4c0-19.2-15.6-34.9-34.9-34.9h-47.1v-32.3H808v32.3h-44.8v-32.3h-22.7v32.3h-43.3v-32.3h-22.7v32.3H628v-32.3h-20.2v-203c1.31.2,2.6-0.4,3.9-0.4h296.7c14.9,0,27,12.1,27,27L935.3,842.7L935.3,842.7z" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    </>
                  )}

                {session === null && !(userIsOwner || props.hideBranding) && (
                  <>
                    <hr className="border-subtle mt-8" />
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
                          router.push(`https://cal.com/signup?email=${target.email.value}`);
                        }}
                        className="mt-4 flex">
                        <EmailInput
                          name="email"
                          id="email"
                          defaultValue={email}
                          className="mr- focus:border-brand-default border-default text-default mt-0 block w-full rounded-none rounded-l-md shadow-sm focus:ring-black  sm:text-sm"
                          placeholder="rick.astley@cal.com"
                        />
                        <Button
                          size="lg"
                          type="submit"
                          className="min-w-max rounded-none rounded-r-md"
                          color="primary">
                          {t("try_for_free")}
                        </Button>
                      </form>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

Success.isBookingPage = true;
Success.PageWrapper = PageWrapper;

type RecurringBookingsProps = {
  eventType: SuccessProps["eventType"];
  recurringBookings: SuccessProps["recurringBookings"];
  date: dayjs.Dayjs;
  duration: number | undefined;
  is24h: boolean;
  allRemainingBookings: boolean;
  isCancelled: boolean;
  tz: string;
};

export function RecurringBookings({
  eventType,
  recurringBookings,
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
  const recurringBookingsSorted = recurringBookings
    ? recurringBookings.sort((a: ConfigType, b: ConfigType) => (dayjs(a).isAfter(dayjs(b)) ? 1 : -1))
    : null;

  if (!duration) return null;

  if (recurringBookingsSorted && allRemainingBookings) {
    return (
      <>
        {eventType.recurringEvent?.count && (
          <span className="font-medium">
            {getEveryFreqFor({
              t,
              recurringEvent: eventType.recurringEvent,
              recurringCount: recurringBookings?.length ?? undefined,
            })}
          </span>
        )}
        {eventType.recurringEvent?.count &&
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
              {eventType.recurringEvent?.count &&
                recurringBookingsSorted.slice(4).map((dateStr: string, idx: number) => (
                  <div key={idx} className={classNames("mb-2", isCancelled ? "line-through" : "")}>
                    {formatToLocalizedDate(dayjs.tz(date, tz), language, "full", tz)}
                    <br />
                    {formatToLocalizedTime(date, language, undefined, !is24h, tz)} -{" "}
                    {formatToLocalizedTime(dayjs(date).add(duration, "m"), language, undefined, !is24h, tz)}{" "}
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

const getEventTypesFromDB = async (id: number) => {
  const userSelect = {
    id: true,
    name: true,
    username: true,
    hideBranding: true,
    theme: true,
    brandColor: true,
    darkBrandColor: true,
    email: true,
    timeZone: true,
  };
  const eventType = await prisma.eventType.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      length: true,
      eventName: true,
      recurringEvent: true,
      requiresConfirmation: true,
      userId: true,
      successRedirectUrl: true,
      customInputs: true,
      locations: true,
      price: true,
      currency: true,
      bookingFields: true,
      disableGuests: true,
      timeZone: true,
      owner: {
        select: userSelect,
      },
      users: {
        select: userSelect,
      },
      hosts: {
        select: {
          user: {
            select: userSelect,
          },
        },
      },
      team: {
        select: {
          slug: true,
          name: true,
          hideBranding: true,
        },
      },
      workflows: {
        select: {
          workflow: {
            select: {
              id: true,
              steps: true,
            },
          },
        },
      },
      metadata: true,
      seatsPerTimeSlot: true,
      seatsShowAttendees: true,
      periodStartDate: true,
      periodEndDate: true,
    },
  });

  if (!eventType) {
    return eventType;
  }

  const metadata = EventTypeMetaDataSchema.parse(eventType.metadata);

  return {
    isDynamic: false,
    ...eventType,
    bookingFields: getBookingFieldsWithSystemFields(eventType),
    metadata,
  };
};

const handleSeatsEventTypeOnBooking = async (
  eventType: {
    seatsPerTimeSlot?: number | null;
    seatsShowAttendees: boolean | null;
    [x: string | number | symbol]: unknown;
  },
  bookingInfo: Partial<
    Prisma.BookingGetPayload<{
      include: {
        attendees: { select: { name: true; email: true } };
        seatsReferences: { select: { referenceUid: true } };
        user: {
          select: {
            id: true;
            name: true;
            email: true;
            username: true;
            timeZone: true;
          };
        };
      };
    }>
  >,
  seatReferenceUid?: string,
  userId?: number
) => {
  if (eventType?.seatsPerTimeSlot !== null) {
    // @TODO: right now bookings with seats doesn't save every description that its entered by every user
    delete bookingInfo.description;
  } else {
    return;
  }
  // @TODO: If handling teams, we need to do more check ups for this.
  if (bookingInfo?.user?.id === userId) {
    return;
  }

  if (!eventType.seatsShowAttendees) {
    const seatAttendee = await prisma.bookingSeat.findFirst({
      where: {
        referenceUid: seatReferenceUid,
      },
      include: {
        attendee: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (seatAttendee) {
      const attendee = bookingInfo?.attendees?.find((a) => {
        return a.email === seatAttendee.attendee?.email;
      });
      bookingInfo["attendees"] = attendee ? [attendee] : [];
    } else {
      bookingInfo["attendees"] = [];
    }
  }
  return bookingInfo;
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const ssr = await ssrInit(context);
  const session = await getServerSession(context);
  let tz: string | null = null;

  if (session) {
    const user = await ssr.viewer.me.fetch();
    tz = user.timeZone;
  }

  const parsedQuery = querySchema.safeParse(context.query);

  if (!parsedQuery.success) return { notFound: true };
  const { uid, eventTypeSlug, seatReferenceUid } = parsedQuery.data;

  const bookingInfoRaw = await prisma.booking.findFirst({
    where: {
      uid: await maybeGetBookingUidFromSeat(prisma, uid),
    },
    select: {
      title: true,
      id: true,
      uid: true,
      description: true,
      customInputs: true,
      smsReminderNumber: true,
      recurringEventId: true,
      startTime: true,
      endTime: true,
      location: true,
      status: true,
      metadata: true,
      cancellationReason: true,
      responses: true,
      rejectionReason: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          timeZone: true,
        },
      },
      attendees: {
        select: {
          name: true,
          email: true,
          timeZone: true,
        },
      },
      eventTypeId: true,
      eventType: {
        select: {
          eventName: true,
          slug: true,
          timeZone: true,
        },
      },
      seatsReferences: {
        select: {
          referenceUid: true,
        },
      },
    },
  });
  if (!bookingInfoRaw) {
    return {
      notFound: true,
    };
  }

  const eventTypeRaw = !bookingInfoRaw.eventTypeId
    ? getDefaultEvent(eventTypeSlug || "")
    : await getEventTypesFromDB(bookingInfoRaw.eventTypeId);
  if (!eventTypeRaw) {
    return {
      notFound: true,
    };
  }

  const bookingInfo = getBookingWithResponses(bookingInfoRaw);
  // @NOTE: had to do this because Server side cant return [Object objects]
  // probably fixable with json.stringify -> json.parse
  bookingInfo["startTime"] = (bookingInfo?.startTime as Date)?.toISOString() as unknown as Date;
  bookingInfo["endTime"] = (bookingInfo?.endTime as Date)?.toISOString() as unknown as Date;

  eventTypeRaw.users = !!eventTypeRaw.hosts?.length
    ? eventTypeRaw.hosts.map((host) => host.user)
    : eventTypeRaw.users;

  if (!eventTypeRaw.users.length) {
    if (!eventTypeRaw.owner)
      return {
        notFound: true,
      };
    eventTypeRaw.users.push({
      ...eventTypeRaw.owner,
    });
  }

  const eventType = {
    ...eventTypeRaw,
    periodStartDate: eventTypeRaw.periodStartDate?.toString() ?? null,
    periodEndDate: eventTypeRaw.periodEndDate?.toString() ?? null,
    metadata: EventTypeMetaDataSchema.parse(eventTypeRaw.metadata),
    recurringEvent: parseRecurringEvent(eventTypeRaw.recurringEvent),
    customInputs: customInputSchema.array().parse(eventTypeRaw.customInputs),
  };

  const profile = {
    name: eventType.team?.name || eventType.users[0]?.name || null,
    email: eventType.team ? null : eventType.users[0].email || null,
    theme: (!eventType.team?.name && eventType.users[0]?.theme) || null,
    brandColor: eventType.team ? null : eventType.users[0].brandColor || null,
    darkBrandColor: eventType.team ? null : eventType.users[0].darkBrandColor || null,
    slug: eventType.team?.slug || eventType.users[0]?.username || null,
  };

  if (bookingInfo !== null && eventType.seatsPerTimeSlot) {
    await handleSeatsEventTypeOnBooking(eventType, bookingInfo, seatReferenceUid, session?.user.id);
  }

  const payment = await prisma.payment.findFirst({
    where: {
      bookingId: bookingInfo.id,
    },
    select: {
      success: true,
      refunded: true,
    },
  });

  return {
    props: {
      themeBasis: eventType.team ? eventType.team.slug : eventType.users[0]?.username,
      hideBranding: eventType.team ? eventType.team.hideBranding : eventType.users[0].hideBranding,
      profile,
      eventType,
      recurringBookings: await getRecurringBookings(bookingInfo.recurringEventId),
      trpcState: ssr.dehydrate(),
      dynamicEventName: bookingInfo?.eventType?.eventName || "",
      bookingInfo,
      paymentStatus: payment,
      ...(tz && { tz }),
    },
  };
}

async function getRecurringBookings(recurringEventId: string | null) {
  if (!recurringEventId) return null;
  const recurringBookings = await prisma.booking.findMany({
    where: {
      recurringEventId,
    },
    select: {
      startTime: true,
    },
  });
  return recurringBookings.map((obj) => obj.startTime.toString());
}
