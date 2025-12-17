import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";

import { getPaymentAppData } from "@calcom/app-store/_utils/payments/getPaymentAppData";
import type { getEventLocationValue } from "@calcom/app-store/locations";
import { getSuccessPageLocationMessage, guessEventLocationType } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
// TODO: Use browser locale, implement Intl in Dayjs maybe?
import "@calcom/dayjs/locales";
import { formatTime } from "@calcom/lib/dayjs";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useGetTheme } from "@calcom/lib/hooks/useTheme";
import isSmsCalEmail from "@calcom/lib/isSmsCalEmail";
import { getEveryFreqFor } from "@calcom/lib/recurringStrings";
import type { AssignmentReason } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import type { Ensure } from "@calcom/types/utils";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@calcom/ui/components/dropdown";
import { Icon } from "@calcom/ui/components/icon";
import { MeetingTimeInTimezones } from "@calcom/ui/components/popover";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

import assignmentReasonBadgeTitleMap from "@lib/booking/assignmentReasonBadgeTitleMap";

import { buildBookingLink } from "../../modules/bookings/lib/buildBookingLink";
import { useBookingDetailsSheetStore } from "../../modules/bookings/store/bookingDetailsSheetStore";
import type { BookingAttendee } from "../../modules/bookings/types";
import { AcceptBookingButton } from "./AcceptBookingButton";
import { RejectBookingButton } from "./RejectBookingButton";
import { BookingActionsDropdown } from "./actions/BookingActionsDropdown";
import {
  useBookingActionsStoreContext,
  BookingActionsStoreProvider,
} from "./actions/BookingActionsStoreProvider";
import {
  shouldShowPendingActions,
  shouldShowRecurringCancelAction,
  shouldShowIndividualReportButton,
  type BookingActionContext,
  getReportAction,
  isActionDisabled,
} from "./actions/bookingActions";
import type { BookingItemProps } from "./types";

type ParsedBooking = ReturnType<typeof buildParsedBooking>;
type TeamEvent = Ensure<NonNullable<ParsedBooking["eventType"]>, "team">;
type TeamEventBooking = Omit<ParsedBooking, "eventType"> & {
  eventType: TeamEvent;
};
type ReroutableBooking = Ensure<TeamEventBooking, "routedFromRoutingFormReponse">;

function buildParsedBooking(booking: BookingItemProps) {
  // The way we fetch bookings there could be eventType object even without an eventType, but id confirms its existence
  const bookingEventType = booking.eventType.id
    ? (booking.eventType as Ensure<
        typeof booking.eventType,
        // It would only ensure that the props are present, if they are optional in the original type. So, it is safe to assert here.
        "id" | "length" | "title" | "slug" | "schedulingType" | "team"
      >)
    : null;

  const parsedMetadata = bookingMetadataSchema.safeParse(booking.metadata ?? null);
  const bookingMetadata = parsedMetadata.success ? parsedMetadata.data : null;

  return {
    ...booking,
    eventType: bookingEventType,
    metadata: bookingMetadata,
  };
}

const isBookingReroutable = (booking: ParsedBooking): booking is ReroutableBooking => {
  // We support only team bookings for now for rerouting
  // Though `routedFromRoutingFormReponse` could be there for a non-team booking, we don't want to support it for now.
  // Let's not support re-routing for a booking without an event-type for now.
  // Such a booking has its event-type deleted and there might not be something to reroute to.
  return !!booking.routedFromRoutingFormReponse && !!booking.eventType?.team;
};

const ConditionalLink = ({
  children,
  onClick,
  bookingLink,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  bookingLink: string;
  className?: string;
}) => {
  const { t } = useLocale();

  if (onClick) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    };

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className={className}
        aria-label={t("view_booking_details")}>
        {children}
      </div>
    );
  }
  return (
    <Link href={bookingLink} className={className}>
      {children}
    </Link>
  );
};

function BookingListItem(booking: BookingItemProps) {
  const parsedBooking = buildParsedBooking(booking);
  const itemRef = useRef<HTMLDivElement>(null);

  const { userTimeZone, userTimeFormat, userEmail } = booking.loggedInUser;
  const { onClick } = booking;
  const {
    t,
    i18n: { language },
  } = useLocale();

  // Get selected booking UID from store
  // The provider should always be available when BookingListItem is rendered (bookingsV3Enabled is true)
  const selectedBookingUid = useBookingDetailsSheetStore((state) => state.selectedBookingUid);
  const isSelected = !!selectedBookingUid && selectedBookingUid === booking.uid;

  // Scroll into view when this booking becomes selected
  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [isSelected]);

  const attendeeList = booking.attendees.map((attendee) => ({
    ...attendee,
    noShow: attendee.noShow || false,
  }));

  const isUpcoming = new Date(booking.endTime) >= new Date();
  const isOngoing = isUpcoming && new Date() >= new Date(booking.startTime);
  const isBookingInPast = new Date(booking.endTime) < new Date();
  const isCancelled = booking.status === BookingStatus.CANCELLED;
  const isConfirmed = booking.status === BookingStatus.ACCEPTED;
  const isRejected = booking.status === BookingStatus.REJECTED;
  const isPending = booking.status === BookingStatus.PENDING;
  const isRescheduled = booking.fromReschedule !== null;
  const isRecurring = booking.recurringEventId !== null;

  const isTabRecurring = booking.listingStatus === "recurring";
  const isTabUnconfirmed = booking.listingStatus === "unconfirmed";
  const isBookingFromRoutingForm = isBookingReroutable(parsedBooking);

  const userSeat = booking.seatsReferences.find((seat) => !!userEmail && seat.attendee?.email === userEmail);

  const isAttendee = !!userSeat;

  const paymentAppData = getPaymentAppData(booking.eventType);

  const location = booking.location as ReturnType<typeof getEventLocationValue>;
  const locationVideoCallUrl = parsedBooking.metadata?.videoCallUrl;

  const { resolvedTheme, forcedTheme } = useGetTheme();
  const hasDarkTheme = !forcedTheme && resolvedTheme === "dark";
  const eventTypeColor =
    booking.eventType.eventTypeColor &&
    booking.eventType.eventTypeColor[hasDarkTheme ? "darkEventTypeColor" : "lightEventTypeColor"];

  const locationToDisplay = getSuccessPageLocationMessage(
    locationVideoCallUrl ? locationVideoCallUrl : location,
    t,
    booking.status
  );
  const provider = guessEventLocationType(location);

  const isDisabledCancelling = booking.eventType.disableCancelling;
  const isDisabledRescheduling = booking.eventType.disableRescheduling;
  const cardCharged = booking?.payment[0]?.success;

  const getSeatReferenceUid = () => {
    return userSeat?.referenceUid;
  };

  const actionContext: BookingActionContext = {
    booking,
    isUpcoming,
    isOngoing,
    isBookingInPast,
    isCancelled,
    isConfirmed,
    isRejected,
    isPending,
    isRescheduled,
    isRecurring,
    isTabRecurring,
    isTabUnconfirmed,
    isBookingFromRoutingForm,
    isDisabledCancelling,
    isDisabledRescheduling,
    isCalVideoLocation:
      !booking.location ||
      booking.location === "integrations:daily" ||
      (typeof booking.location === "string" && booking.location.trim() === ""),
    showPendingPayment: paymentAppData.enabled && booking.payment.length && !booking.paid,
    isAttendee,
    cardCharged,
    attendeeList,
    getSeatReferenceUid,
    t,
  } as BookingActionContext;

  const RequestSentMessage = () => {
    return (
      <Badge startIcon="send" size="md" variant="gray" data-testid="request_reschedule_sent">
        {t("reschedule_request_sent")}
      </Badge>
    );
  };

  const bookingYear = dayjs(booking.startTime).year();
  const currentYear = dayjs().year();
  const isDifferentYear = bookingYear !== currentYear;

  const startTime = dayjs(booking.startTime)
    .tz(userTimeZone)
    .locale(language)
    .format(isUpcoming ? (isDifferentYear ? "ddd, D MMM YYYY" : "ddd, D MMM") : "D MMMM YYYY");

  // Getting accepted recurring dates to show
  const recurringDates = booking.recurringInfo?.bookings[BookingStatus.ACCEPTED]
    .concat(booking.recurringInfo?.bookings[BookingStatus.CANCELLED])
    .concat(booking.recurringInfo?.bookings[BookingStatus.PENDING])
    .sort((date1: Date, date2: Date) => date1.getTime() - date2.getTime());

  const bookingLink = buildBookingLink({
    bookingUid: booking.uid,
    allRemainingBookings: isTabRecurring,
    email: booking.attendees?.[0]?.email,
  });

  const title = booking.title;

  const showPendingPayment = paymentAppData.enabled && booking.payment.length && !booking.paid;

  const setIsOpenReportDialog = useBookingActionsStoreContext((state) => state.setIsOpenReportDialog);
  const setIsCancelDialogOpen = useBookingActionsStoreContext((state) => state.setIsCancelDialogOpen);

  const reportAction = getReportAction(actionContext);
  const reportActionWithHandler = {
    ...reportAction,
    onClick: () => setIsOpenReportDialog(true),
  };

  return (
    <div
      ref={itemRef}
      data-testid="booking-item"
      data-today={String(booking.isToday)}
      data-booking-list-item="true"
      data-booking-uid={booking.uid}
      className={classNames(
        "group relative w-full transition-all duration-100 ease-out",
        "hover:bg-cal-muted",
        isSelected &&
          "bg-cal-muted before:bg-brand-default rounded-r-md before:absolute before:left-0 before:top-0 before:h-full before:w-1"
      )}>
      <div className="flex flex-col sm:flex-row">
        <div className="sm:min-w-48 hidden align-top ltr:pl-3 rtl:pr-6 sm:table-cell">
          <div className="flex h-full items-center">
            {eventTypeColor && <div className="h-[70%] w-0.5" style={{ backgroundColor: eventTypeColor }} />}
            <ConditionalLink onClick={onClick} bookingLink={bookingLink} className="ml-3">
              <div className="cursor-pointer py-4">
                <div className="text-emphasis text-sm leading-6">{startTime}</div>
                <div className="text-subtle text-sm">
                  {formatTime(booking.startTime, userTimeFormat, userTimeZone)} -{" "}
                  {formatTime(booking.endTime, userTimeFormat, userTimeZone)}
                  <MeetingTimeInTimezones
                    timeFormat={userTimeFormat}
                    userTimezone={userTimeZone}
                    startTime={booking.startTime}
                    endTime={booking.endTime}
                    attendees={booking.attendees}
                  />
                </div>
                {!isPending && (
                  <div>
                    {(provider?.label ||
                      (typeof locationToDisplay === "string" && locationToDisplay?.startsWith("https://"))) &&
                      locationToDisplay.startsWith("http") && (
                        <a
                          href={locationToDisplay}
                          onClick={(e) => e.stopPropagation()}
                          target="_blank"
                          title={locationToDisplay}
                          rel="noreferrer"
                          className="text-sm leading-6 text-blue-600 hover:underline dark:text-blue-400">
                          <div className="flex items-center gap-2">
                            {provider?.iconUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={provider.iconUrl}
                                width={16}
                                height={16}
                                className="h-4 w-4 rounded-sm"
                                alt={`${provider?.label} logo`}
                              />
                            )}
                            {provider?.label
                              ? t("join_event_location", { eventLocationType: provider?.label })
                              : t("join_meeting")}
                          </div>
                        </a>
                      )}
                  </div>
                )}
              </div>
            </ConditionalLink>
          </div>
        </div>
        <div
          data-testid="title-and-attendees"
          className={classNames("flex-1 px-4", isRejected && "line-through")}>
          <ConditionalLink onClick={onClick} bookingLink={bookingLink} className="flex h-full flex-col">
            {/* Time and Badges for mobile */}
            <div className="w-full pb-2 pt-4 sm:hidden">
              <div className="flex w-full items-center justify-between sm:hidden">
                <div className="text-emphasis text-sm leading-6">{startTime}</div>
                <div className="text-subtle pr-2 text-sm">
                  {formatTime(booking.startTime, userTimeFormat, userTimeZone)} -{" "}
                  {formatTime(booking.endTime, userTimeFormat, userTimeZone)}
                  <MeetingTimeInTimezones
                    timeFormat={userTimeFormat}
                    userTimezone={userTimeZone}
                    startTime={booking.startTime}
                    endTime={booking.endTime}
                    attendees={booking.attendees}
                  />
                </div>
              </div>

              {isPending && (
                <Badge className="ltr:mr-2 rtl:ml-2 sm:hidden" variant="orange">
                  {t("unconfirmed")}
                </Badge>
              )}
              {booking.eventType?.team && (
                <Badge className="ltr:mr-2 rtl:ml-2 sm:hidden" variant="gray">
                  {booking.eventType.team.name}
                </Badge>
              )}
              {showPendingPayment && (
                <Badge className="ltr:mr-2 rtl:ml-2 sm:hidden" variant="orange">
                  {t("pending_payment")}
                </Badge>
              )}
              {isRescheduled && (
                <Tooltip content={`${t("rescheduled_by")} ${booking.rescheduler}`}>
                  <Badge variant="orange" className="ltr:mr-2 rtl:ml-2 sm:hidden">
                    {t("rescheduled")}
                  </Badge>
                </Tooltip>
              )}
              {recurringDates !== undefined && (
                <div className="text-muted text-sm sm:hidden">
                  <RecurringBookingsTooltip
                    userTimeFormat={userTimeFormat}
                    userTimeZone={userTimeZone}
                    booking={booking}
                    recurringDates={recurringDates}
                  />
                </div>
              )}
            </div>

            <div className="cursor-pointer py-4">
              <div
                title={title}
                className={classNames(
                  "max-w-10/12 text-emphasis sm:max-w-56 break-words text-sm font-medium leading-6 md:max-w-full",
                  isCancelled ? "line-through" : ""
                )}>
                {title}
                <span> </span>

                {showPendingPayment && (
                  <Badge className="hidden sm:inline-flex" variant="orange">
                    {t("pending_payment")}
                  </Badge>
                )}
              </div>
              {booking.description && (
                <div
                  className="max-w-10/12 text-default sm:max-w-32 md:max-w-52 xl:max-w-80 truncate text-sm"
                  title={booking.description}>
                  &quot;{booking.description}&quot;
                </div>
              )}
              {booking.attendees.length !== 0 && (
                <DisplayAttendees
                  attendees={attendeeList}
                  user={booking.user}
                  currentEmail={userEmail}
                  bookingUid={booking.uid}
                  isBookingInPast={isBookingInPast}
                />
              )}
              {isCancelled && booking.rescheduled && (
                <div className="mt-2 inline-block md:hidden">
                  <RequestSentMessage />
                </div>
              )}
            </div>
          </ConditionalLink>
        </div>
        <div className="flex flex-col flex-wrap items-end justify-end gap-2 py-4 pl-4 text-right text-sm font-medium ltr:pr-4 rtl:pl-4 sm:flex-shrink-0 sm:flex-row sm:flex-nowrap sm:items-start sm:pl-0">
          {shouldShowPendingActions(actionContext) && (
            <div className="flex space-x-2 rtl:space-x-reverse">
              <RejectBookingButton
                bookingId={booking.id}
                bookingUid={booking.uid}
                recurringEventId={booking.recurringEventId}
                isRecurring={isRecurring}
                isTabRecurring={isTabRecurring}
                isTabUnconfirmed={isTabUnconfirmed}
              />
              <AcceptBookingButton
                bookingId={booking.id}
                bookingUid={booking.uid}
                recurringEventId={booking.recurringEventId}
                isRecurring={isRecurring}
                isTabRecurring={isTabRecurring}
                isTabUnconfirmed={isTabUnconfirmed}
              />
            </div>
          )}
          {shouldShowRecurringCancelAction(actionContext) && (
            <Button
              className="whitespace-nowrap"
              key="cancel"
              data-testid="cancel"
              onClick={(e) => {
                e.stopPropagation();
                setIsCancelDialogOpen(true);
              }}
              StartIcon="circle-x"
              disabled={isActionDisabled("cancel", actionContext)}
              data-booking-uid={booking.uid}
              color="destructive">
              {t("cancel_all_remaining")}
            </Button>
          )}
          {isCancelled && booking.rescheduled && (
            <div className="hidden items-center md:flex">
              <RequestSentMessage />
            </div>
          )}
          {shouldShowIndividualReportButton(actionContext) && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="icon"
                color="destructive"
                StartIcon={reportActionWithHandler.icon}
                onClick={reportActionWithHandler.onClick}
                disabled={reportActionWithHandler.disabled}
                data-testid={reportActionWithHandler.id}
                className="min-h-[34px] min-w-[34px]"
                tooltip={reportActionWithHandler.label}
              />
            </div>
          )}
          <BookingActionsDropdown booking={booking} context="list" />
        </div>
      </div>
      <BookingItemBadges
        booking={booking}
        isPending={isPending}
        isRejected={isRejected}
        recurringDates={recurringDates}
        userTimeFormat={userTimeFormat}
        userTimeZone={userTimeZone}
        isRescheduled={isRescheduled}
      />
    </div>
  );
}

const BookingItemBadges = ({
  booking,
  isPending,
  isRejected,
  recurringDates,
  userTimeFormat,
  userTimeZone,
  isRescheduled,
}: {
  booking: BookingItemProps;
  isPending: boolean;
  isRejected: boolean;
  recurringDates: Date[] | undefined;
  userTimeFormat: number | null | undefined;
  userTimeZone: string | undefined;
  isRescheduled: boolean;
}) => {
  const { t } = useLocale();

  return (
    <div className="hidden h-9 flex-row items-center pb-4 pl-6 sm:flex">
      {isPending && (
        <Badge className="ltr:mr-2 rtl:ml-2" variant="orange">
          {t("unconfirmed")}
        </Badge>
      )}
      {isRescheduled && (
        <Tooltip content={`${t("rescheduled_by")} ${booking.rescheduler}`}>
          <Badge variant="orange" className="ltr:mr-2 rtl:ml-2">
            {t("rescheduled")}
          </Badge>
        </Tooltip>
      )}
      {isRejected && !isRescheduled && booking.assignmentReason.length === 0 && (
        <Badge variant="gray" className="ltr:mr-2 rtl:ml-2">
          {t("rejected")}
        </Badge>
      )}
      {booking.eventType?.team && (
        <Badge className="ltr:mr-2 rtl:ml-2" variant="gray">
          {booking.eventType.team.name}
        </Badge>
      )}
      {booking?.assignmentReason.length > 0 && (
        <AssignmentReasonTooltip assignmentReason={booking.assignmentReason[0]} />
      )}
      {booking.report && (
        <Tooltip
          content={
            <div className="text-xs">
              {(() => {
                const reasonKey = `report_reason_${booking.report.reason.toLowerCase()}`;
                const reasonText = t(reasonKey);
                return booking.report.description
                  ? `${reasonText}: ${booking.report.description}`
                  : reasonText;
              })()}
            </div>
          }>
          <Badge className="ltr:mr-2 rtl:ml-2" variant="red">
            {t("reported")}
          </Badge>
        </Tooltip>
      )}
      {booking.paid && !booking.payment[0] ? (
        <Badge className="ltr:mr-2 rtl:ml-2" variant="orange">
          {t("error_collecting_card")}
        </Badge>
      ) : booking.paid ? (
        <Badge className="ltr:mr-2 rtl:ml-2" variant="green" data-testid="paid_badge">
          {booking.payment[0].paymentOption === "HOLD" ? t("card_held") : t("paid")}
        </Badge>
      ) : null}
      {recurringDates !== undefined && (
        <div className="text-muted -mt-1 text-sm">
          <RecurringBookingsTooltip
            userTimeFormat={userTimeFormat}
            userTimeZone={userTimeZone}
            booking={booking}
            recurringDates={recurringDates}
          />
        </div>
      )}
    </div>
  );
};

interface RecurringBookingsTooltipProps {
  booking: BookingItemProps;
  recurringDates: Date[];
  userTimeZone: string | undefined;
  userTimeFormat: number | null | undefined;
}

const RecurringBookingsTooltip = ({
  booking,
  recurringDates,
  userTimeZone,
  userTimeFormat,
}: RecurringBookingsTooltipProps) => {
  const {
    t,
    i18n: { language },
  } = useLocale();
  const now = new Date();
  const recurringCount = recurringDates.filter((recurringDate) => {
    return (
      recurringDate >= now &&
      !booking.recurringInfo?.bookings[BookingStatus.CANCELLED]
        .map((date) => date.toString())
        .includes(recurringDate.toString())
    );
  }).length;

  return (
    (booking.recurringInfo &&
      booking.eventType?.recurringEvent?.freq != null &&
      (booking.listingStatus === "recurring" ||
        booking.listingStatus === "unconfirmed" ||
        booking.listingStatus === "cancelled") && (
        <div className="underline decoration-gray-400 decoration-dashed underline-offset-2">
          <div className="flex">
            <Tooltip
              content={recurringDates.map((aDate, key) => {
                const pastOrCancelled =
                  aDate < now ||
                  booking.recurringInfo?.bookings[BookingStatus.CANCELLED]
                    .map((date) => date.toString())
                    .includes(aDate.toString());
                return (
                  <p key={key} className={classNames(pastOrCancelled && "line-through")}>
                    {formatTime(aDate, userTimeFormat, userTimeZone)}
                    {" - "}
                    {dayjs(aDate).locale(language).format("D MMMM YYYY")}
                  </p>
                );
              })}>
              <div className="text-default">
                <Icon
                  name="refresh-ccw"
                  strokeWidth="3"
                  className="text-muted float-left mr-1 mt-1.5 inline-block h-3 w-3"
                />
                <p className="mt-1 pl-5 text-xs">
                  {booking.status === BookingStatus.ACCEPTED
                    ? `${t("event_remaining_other", {
                        count: recurringCount,
                      })}`
                    : getEveryFreqFor({
                        t,
                        recurringEvent: booking.eventType.recurringEvent,
                        recurringCount: booking.recurringInfo.count,
                      })}
                </p>
              </div>
            </Tooltip>
          </div>
        </div>
      )) ||
    null
  );
};

interface UserProps {
  id: number;
  name: string | null;
  email: string;
}

const FirstAttendee = ({
  user,
  currentEmail,
}: {
  user: UserProps;
  currentEmail: string | null | undefined;
}) => {
  const { t } = useLocale();
  return user.email === currentEmail ? (
    <div className="inline-block">{t("you")}</div>
  ) : (
    <a
      key={user.email}
      className="hover:text-blue-500"
      href={`mailto:${user.email}`}
      onClick={(e) => e.stopPropagation()}>
      {user.name || user.email}
    </a>
  );
};

type NoShowProps = {
  bookingUid: string;
  isBookingInPast: boolean;
};

const Attendee = (attendeeProps: BookingAttendee & NoShowProps) => {
  const { email, name, bookingUid, isBookingInPast, noShow, phoneNumber, user } = attendeeProps;
  const { t } = useLocale();

  const utils = trpc.useUtils();
  const [openDropdown, setOpenDropdown] = useState(false);
  const { copyToClipboard, isCopied } = useCopy();

  const noShowMutation = trpc.viewer.loggedInViewerRouter.markNoShow.useMutation({
    onSuccess: async (data) => {
      showToast(data.message, "success");
      await utils.viewer.bookings.invalidate();
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const displayName = user?.name || name || user?.email || email;

  return (
    <Dropdown open={openDropdown} onOpenChange={setOpenDropdown}>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="guest"
          onClick={(e) => e.stopPropagation()}
          className="radix-state-open:text-blue-500 transition hover:text-blue-500">
          {noShow ? (
            <>
              {displayName} <Icon name="eye-off" className="inline h-4" />
            </>
          ) : (
            <>{displayName}</>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent>
          {!isSmsCalEmail(email) && (
            <DropdownMenuItem className="focus:outline-none">
              <DropdownItem
                StartIcon="mail"
                href={`mailto:${email}`}
                onClick={(e) => {
                  setOpenDropdown(false);
                  e.stopPropagation();
                }}>
                <a href={`mailto:${email}`}>{t("email")}</a>
              </DropdownItem>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem className="focus:outline-none">
            <DropdownItem
              StartIcon={isCopied ? "clipboard-check" : "clipboard"}
              onClick={(e) => {
                e.preventDefault();
                const isEmailCopied = isSmsCalEmail(email);
                copyToClipboard(isEmailCopied ? email : phoneNumber ?? "");
                setOpenDropdown(false);
                showToast(isEmailCopied ? t("email_copied") : t("phone_number_copied"), "success");
              }}>
              {!isCopied ? t("copy") : t("copied")}
            </DropdownItem>
          </DropdownMenuItem>

          {isBookingInPast && (
            <DropdownMenuItem className="focus:outline-none">
              <DropdownItem
                data-testid={noShow ? "unmark-no-show" : "mark-no-show"}
                onClick={(e) => {
                  e.preventDefault();
                  setOpenDropdown(false);
                  noShowMutation.mutate({ bookingUid, attendees: [{ noShow: !noShow, email }] });
                }}
                StartIcon={noShow ? "eye" : "eye-off"}>
                {noShow ? t("unmark_as_no_show") : t("mark_as_no_show")}
              </DropdownItem>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </Dropdown>
  );
};

type GroupedAttendeeProps = {
  attendees: BookingAttendee[];
  bookingUid: string;
};

const GroupedAttendees = (groupedAttendeeProps: GroupedAttendeeProps) => {
  const { bookingUid, attendees } = groupedAttendeeProps;
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const noShowMutation = trpc.viewer.loggedInViewerRouter.markNoShow.useMutation({
    onSuccess: async (data) => {
      showToast(t(data.message), "success");
      await utils.viewer.bookings.invalidate();
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  type FormValues = {
    attendees: Array<{ id: number; email: string; noShow: boolean }>;
  };

  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      attendees: attendees.map((a) => ({ id: a.id, email: a.email, noShow: a.noShow || false })),
    },
    mode: "onBlur",
  });

  const { fields } = useFieldArray({
    control,
    name: "attendees",
  });

  const onSubmit = (data: FormValues) => {
    const filteredData = data.attendees.slice(1).map((attendee) => ({
      email: attendee.email,
      noShow: attendee.noShow,
    }));
    noShowMutation.mutate({ bookingUid, attendees: filteredData });
    setOpenDropdown(false);
  };

  const [openDropdown, setOpenDropdown] = useState(false);

  return (
    <Dropdown open={openDropdown} onOpenChange={setOpenDropdown}>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="more-guests"
          onClick={(e) => e.stopPropagation()}
          className="radix-state-open:text-blue-500 transition hover:text-blue-500 focus:outline-none">
          {t("plus_more", { count: attendees.length - 1 })}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[300px]">
        <DropdownMenuLabel className="text-xs font-medium uppercase">
          {t("mark_as_no_show_title")}
        </DropdownMenuLabel>
        <form onSubmit={handleSubmit(onSubmit)}>
          {fields.slice(1).map((field, index) => {
            const attendee = attendees[index + 1];
            const displayName =
              attendee.user?.name || attendee.name || attendee.user?.email || attendee.email;
            const hasName = attendee.name || attendee.user?.name;

            return (
              <Controller
                key={field.id}
                name={`attendees.${index + 1}.noShow`}
                control={control}
                render={({ field: { onChange, value } }) => (
                  <DropdownMenuCheckboxItem
                    checked={value || false}
                    onCheckedChange={onChange}
                    className="focus:outline-none"
                    onClick={(e) => {
                      e.preventDefault();
                      onChange(!value);
                    }}>
                    <div className={`w-full ${value ? "line-through" : ""}`}>
                      {hasName ? (
                        <>
                          <div>{displayName}</div>
                          <div className="text-subtle text-xs">{field.email}</div>
                        </>
                      ) : (
                        <div>{field.email}</div>
                      )}
                    </div>
                  </DropdownMenuCheckboxItem>
                )}
              />
            );
          })}
          <DropdownMenuSeparator />
          <div className="flex justify-end p-2">
            <Button
              data-testid="update-no-show"
              color="secondary"
              onClick={(e) => {
                e.preventDefault();
                handleSubmit(onSubmit)();
              }}>
              {t("mark_as_no_show_title")}
            </Button>
          </div>
        </form>
      </DropdownMenuContent>
    </Dropdown>
  );
};

const GroupedGuests = ({ guests }: { guests: BookingAttendee[] }) => {
  const [openDropdown, setOpenDropdown] = useState(false);
  const { t } = useLocale();
  const { copyToClipboard, isCopied } = useCopy();
  const [selectedEmail, setSelectedEmail] = useState("");

  return (
    <Dropdown
      open={openDropdown}
      onOpenChange={(value) => {
        setOpenDropdown(value);
        setSelectedEmail("");
      }}>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="radix-state-open:text-blue-500 transition hover:text-blue-500 focus:outline-none">
          {t("plus_more", { count: guests.length - 1 })}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[300px]">
        <DropdownMenuLabel className="text-xs font-medium uppercase">{t("guests")}</DropdownMenuLabel>
        {guests.slice(1).map((guest) => {
          const displayName = guest.user?.name || guest.name || guest.user?.email || guest.email;
          const hasName = guest.name || guest.user?.name;

          return (
            <DropdownMenuItem key={guest.id}>
              <DropdownItem
                className="pr-6 focus:outline-none"
                StartIcon={selectedEmail === guest.email ? "circle-check" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedEmail(guest.email);
                }}>
                <div className={`${selectedEmail !== guest.email ? "pl-6" : ""}`}>
                  {hasName ? (
                    <>
                      <div>{displayName}</div>
                      <div className="text-subtle text-xs">{guest.email}</div>
                    </>
                  ) : (
                    <div>{guest.email}</div>
                  )}
                </div>
              </DropdownItem>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <div className="flex justify-end gap-2 p-2">
          <Link href={`mailto:${selectedEmail}`}>
            <Button
              color="secondary"
              disabled={selectedEmail.length === 0}
              onClick={(e) => {
                setOpenDropdown(false);
                e.stopPropagation();
              }}>
              {t("email")}
            </Button>
          </Link>
          <Button
            color="secondary"
            disabled={selectedEmail.length === 0}
            onClick={(e) => {
              e.preventDefault();
              copyToClipboard(selectedEmail);
              showToast(t("email_copied"), "success");
            }}>
            {!isCopied ? t("copy") : t("copied")}
          </Button>
        </div>
      </DropdownMenuContent>
    </Dropdown>
  );
};

const DisplayAttendees = ({
  attendees,
  user,
  currentEmail,
  bookingUid,
  isBookingInPast,
}: {
  attendees: BookingAttendee[];
  user: UserProps | null;
  currentEmail?: string | null;
  bookingUid: string;
  isBookingInPast: boolean;
}) => {
  const { t } = useLocale();
  attendees.sort((a, b) => a.id - b.id);

  return (
    <div className="text-emphasis text-sm" onClick={(e) => e.stopPropagation()}>
      {user && <FirstAttendee user={user} currentEmail={currentEmail} />}
      {attendees.length > 1 ? <span>,&nbsp;</span> : <span>&nbsp;{t("and")}&nbsp;</span>}
      <Attendee {...attendees[0]} bookingUid={bookingUid} isBookingInPast={isBookingInPast} />
      {attendees.length > 1 && (
        <>
          <div className="text-emphasis inline-block text-sm">&nbsp;{t("and")}&nbsp;</div>
          {attendees.length > 2 ? (
            <Tooltip
              content={attendees.slice(1).map((attendee) => (
                <p key={attendee.email}>
                  <Attendee {...attendee} bookingUid={bookingUid} isBookingInPast={isBookingInPast} />
                </p>
              ))}>
              {isBookingInPast ? (
                <GroupedAttendees attendees={attendees} bookingUid={bookingUid} />
              ) : (
                <GroupedGuests guests={attendees} />
              )}
            </Tooltip>
          ) : (
            <Attendee {...attendees[1]} bookingUid={bookingUid} isBookingInPast={isBookingInPast} />
          )}
        </>
      )}
    </div>
  );
};

const AssignmentReasonTooltip = ({ assignmentReason }: { assignmentReason: AssignmentReason }) => {
  const { t } = useLocale();
  const badgeTitle = assignmentReasonBadgeTitleMap(assignmentReason.reasonEnum);
  return (
    <Tooltip content={<p>{assignmentReason.reasonString}</p>}>
      <Badge className="ltr:mr-2 rtl:ml-2" variant="gray">
        {t(badgeTitle)}
      </Badge>
    </Tooltip>
  );
};

// Wrap BookingListItem with BookingActionsStoreProvider to provide isolated store for each booking
const BookingListItemWithProvider = (props: BookingItemProps) => {
  return (
    <BookingActionsStoreProvider>
      <BookingListItem {...props} />
    </BookingActionsStoreProvider>
  );
};

export default BookingListItemWithProvider;
