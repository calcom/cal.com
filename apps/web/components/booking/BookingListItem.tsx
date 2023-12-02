import Link from "next/link";
import { useState } from "react";

import type { EventLocationType } from "@calcom/app-store/locations";
import { getEventLocationType } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
// TODO: Use browser locale, implement Intl in Dayjs maybe?
import "@calcom/dayjs/locales";
import ViewRecordingsDialog from "@calcom/features/ee/video/ViewRecordingsDialog";
import classNames from "@calcom/lib/classNames";
import { formatTime } from "@calcom/lib/date-fns";
import getPaymentAppData from "@calcom/lib/getPaymentAppData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookingStatus } from "@calcom/prisma/enums";
import type { RouterInputs, RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Badge, MeetingTimeInTimezones, showToast } from "@calcom/ui";

import BookingListItemActions, { computeBookingFlags } from "@components/booking/BookingListItemActions";
import DisplayAttendees from "@components/booking/DisplayAttendees";
import RecurringBookingsTooltip from "@components/booking/RecurringBookingsTooltip";
import RescheduleRequestSentBadge from "@components/booking/RescheduleRequestSentBadge";
import { ChargeCardDialog } from "@components/dialog/ChargeCardDialog";
import { EditLocationDialog } from "@components/dialog/EditLocationDialog";
import { RescheduleDialog } from "@components/dialog/RescheduleDialog";

type BookingListingStatus = RouterInputs["viewer"]["bookings"]["get"]["filters"]["status"];

type BookingItem = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][number];

export type BookingItemProps = BookingItem & {
  listingStatus: BookingListingStatus;
  recurringInfo: RouterOutputs["viewer"]["bookings"]["get"]["recurringInfo"][number] | undefined;
  loggedInUser: {
    userId: number | undefined;
    userTimeZone: string | undefined;
    userTimeFormat: number | null | undefined;
    userEmail: string | undefined;
  };
};

function BookingListItem(booking: BookingItemProps) {
  const { userTimeZone, userTimeFormat, userEmail } = booking.loggedInUser;

  const {
    t,
    i18n: { language },
  } = useLocale();
  const utils = trpc.useContext();
  const [chargeCardDialogIsOpen, setChargeCardDialogIsOpen] = useState(false);
  const [viewRecordingsDialogIsOpen, setViewRecordingsDialogIsOpen] = useState<boolean>(false);

  const { isUpcoming, isPast, isCancelled, isConfirmed, isRejected, isPending, isTabRecurring } =
    computeBookingFlags(booking);

  const paymentAppData = getPaymentAppData(booking.eventType);

  const startTime = dayjs(booking.startTime)
    .tz(userTimeZone)
    .locale(language)
    .format(isUpcoming ? "ddd, D MMM" : "D MMMM YYYY");
  const [isOpenRescheduleDialog, setIsOpenRescheduleDialog] = useState(false);
  const [isOpenSetLocationDialog, setIsOpenLocationDialog] = useState(false);
  const setLocationMutation = trpc.viewer.bookings.editLocation.useMutation({
    onSuccess: () => {
      showToast(t("location_updated"), "success");
      setIsOpenLocationDialog(false);
      utils.viewer.bookings.invalidate();
    },
  });

  const saveLocation = (
    newLocationType: EventLocationType["type"],
    details: {
      [key: string]: string;
    }
  ) => {
    let newLocation = newLocationType as string;
    const eventLocationType = getEventLocationType(newLocationType);
    if (eventLocationType?.organizerInputType) {
      newLocation = details[Object.keys(details)[0]];
    }
    setLocationMutation.mutate({ bookingId: booking.id, newLocation, details });
  };

  // Getting accepted recurring dates to show
  const recurringDates = booking.recurringInfo?.bookings[BookingStatus.ACCEPTED]
    .concat(booking.recurringInfo?.bookings[BookingStatus.CANCELLED])
    .concat(booking.recurringInfo?.bookings[BookingStatus.PENDING])
    .sort((date1: Date, date2: Date) => date1.getTime() - date2.getTime());

  const buildBookingLink = () => {
    const urlSearchParams = new URLSearchParams({
      allRemainingBookings: isTabRecurring.toString(),
    });
    if (booking.attendees[0]) urlSearchParams.set("email", booking.attendees[0].email);
    return `/booking/${booking.uid}?${urlSearchParams.toString()}`;
  };

  const bookingLink = buildBookingLink();

  const title = booking.title;

  const showViewRecordingsButton = !!(booking.isRecorded && isPast && isConfirmed);
  const showCheckRecordingButton =
    isPast &&
    isConfirmed &&
    !booking.isRecorded &&
    (!booking.location || booking.location === "integrations:daily" || booking?.location?.trim() === "");

  return (
    <>
      <RescheduleDialog
        isOpenDialog={isOpenRescheduleDialog}
        setIsOpenDialog={setIsOpenRescheduleDialog}
        bookingUId={booking.uid}
      />
      <EditLocationDialog
        booking={booking}
        saveLocation={saveLocation}
        isOpenDialog={isOpenSetLocationDialog}
        setShowLocationModal={setIsOpenLocationDialog}
        teamId={booking.eventType?.team?.id}
      />
      {booking.paid && booking.payment[0] && (
        <ChargeCardDialog
          isOpenDialog={chargeCardDialogIsOpen}
          setIsOpenDialog={setChargeCardDialogIsOpen}
          bookingId={booking.id}
          paymentAmount={booking.payment[0].amount}
          paymentCurrency={booking.payment[0].currency}
        />
      )}
      {(showViewRecordingsButton || showCheckRecordingButton) && (
        <ViewRecordingsDialog
          booking={booking}
          isOpenDialog={viewRecordingsDialogIsOpen}
          setIsOpenDialog={setViewRecordingsDialogIsOpen}
          timeFormat={userTimeFormat ?? null}
        />
      )}

      <tr data-testid="booking-item" className="hover:bg-muted group flex flex-col sm:flex-row">
        <td className="hidden align-top ltr:pl-6 rtl:pr-6 sm:table-cell sm:min-w-[12rem]">
          <Link href={bookingLink}>
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
              {isPending && (
                <Badge className="ltr:mr-2 rtl:ml-2" variant="orange">
                  {t("unconfirmed")}
                </Badge>
              )}
              {booking.eventType?.team && (
                <Badge className="ltr:mr-2 rtl:ml-2" variant="gray">
                  {booking.eventType.team.name}
                </Badge>
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
                <div className="text-muted mt-2 text-sm">
                  <RecurringBookingsTooltip
                    userTimeFormat={userTimeFormat}
                    userTimeZone={userTimeZone}
                    booking={booking}
                    recurringDates={recurringDates}
                  />
                </div>
              )}
            </div>
          </Link>
        </td>
        <td className={`w-full px-4${isRejected ? " line-through" : ""}`}>
          <Link href={bookingLink}>
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
              {!!booking?.eventType?.price && !booking.paid && (
                <Badge className="ltr:mr-2 rtl:ml-2 sm:hidden" variant="orange">
                  {t("pending_payment")}
                </Badge>
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
                  "max-w-10/12 sm:max-w-56 text-emphasis text-sm font-medium leading-6 md:max-w-full",
                  isCancelled ? "line-through" : ""
                )}>
                {title}
                <span> </span>

                {paymentAppData.enabled && !booking.paid && booking.payment.length && (
                  <Badge className="me-2 ms-2 hidden sm:inline-flex" variant="orange">
                    {t("pending_payment")}
                  </Badge>
                )}
              </div>
              {booking.description && (
                <div
                  className="max-w-10/12 sm:max-w-32 md:max-w-52 xl:max-w-80 text-default truncate text-sm"
                  title={booking.description}>
                  &quot;{booking.description}&quot;
                </div>
              )}
              {booking.attendees.length !== 0 && (
                <DisplayAttendees
                  attendees={booking.attendees}
                  user={booking.user}
                  currentEmail={userEmail}
                />
              )}
              {isCancelled && booking.rescheduled && (
                <div className="mt-2 inline-block md:hidden">
                  <RescheduleRequestSentBadge />
                </div>
              )}
            </div>
          </Link>
        </td>
        <BookingListItemActions
          booking={booking}
          setChargeCardDialogIsOpen={setChargeCardDialogIsOpen}
          setViewRecordingsDialogIsOpen={setViewRecordingsDialogIsOpen}
          setIsOpenRescheduleDialog={setIsOpenRescheduleDialog}
          setIsOpenLocationDialog={setIsOpenLocationDialog}
          showViewRecordingsButton={showViewRecordingsButton}
          showCheckRecordingButton={showCheckRecordingButton}
        />
      </tr>
    </>
  );
}

export default BookingListItem;
