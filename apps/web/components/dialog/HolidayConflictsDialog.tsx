import type { Dispatch, SetStateAction } from "react";
import { memo, useState } from "react";

import dayjs from "@calcom/dayjs";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { formatTime } from "@calcom/lib/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";

import { HolidayEmojiBox } from "@components/holidays/HolidayEmojiBox";

import { CancelBookingDialog } from "./CancelBookingDialog";
import { RescheduleDialog } from "./RescheduleDialog";

type HolidayConflict = RouterOutputs["viewer"]["holidays"]["checkConflicts"]["conflicts"][number];
type ConflictingBooking = HolidayConflict["bookings"][number];

interface IHolidayConflictsDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  conflicts: HolidayConflict[];
  userTimeZone?: string;
  userTimeFormat?: number | null;
}

interface BookingItemProps {
  booking: ConflictingBooking;
  userTimeZone?: string;
  userTimeFormat?: number | null;
  onRescheduleRequest: (bookingUid: string) => void;
  onCancel: (booking: ConflictingBooking) => void;
}

const BookingItem = memo(function BookingItem({
  booking,
  userTimeZone,
  userTimeFormat,
  onRescheduleRequest,
  onCancel,
}: BookingItemProps) {
  const { t } = useLocale();
  const timeFormat = userTimeFormat ?? 12;
  const timezone = userTimeZone ?? dayjs.tz.guess();

  const formattedTime = `${formatTime(booking.startTime, timeFormat, timezone)} - ${formatTime(
    booking.endTime,
    timeFormat,
    timezone
  )}`;

  // Format participants: "You and [attendees]" - user is always the host since these are their bookings
  const getParticipantsText = () => {
    if (!booking.attendees || booking.attendees.length === 0) {
      return t("you");
    }
    // Show "You and attendee1, attendee2, ..." - use name if available, otherwise email
    const attendeeNames = booking.attendees.map((a) => a.name || a.email).join(", ");
    return `${t("you")} ${t("and")} ${attendeeNames}`;
  };

  const participantsText = getParticipantsText();

  return (
    <div className="bg-default border-subtle dark:bg-subtle dark:border-default relative ml-4 flex items-center justify-between gap-3 rounded-lg border p-3">
      {/* Left accent bar */}
      <div className="bg-attention absolute left-0 top-2 h-[calc(100%-16px)] w-1 rounded-full dark:bg-orange-300" />
      <div className="min-w-0 flex-1 pl-2">
        <p className="text-emphasis truncate text-sm font-medium">{booking.title}</p>
        <p className="text-subtle dark:text-default mt-0.5 text-xs">{formattedTime}</p>
        {participantsText && (
          <p className="text-muted dark:text-subtle mt-0.5 truncate text-xs">{participantsText}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          color="secondary"
          size="sm"
          StartIcon="external-link"
          href={`/booking/${booking.uid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="dark:border-default px-2"
        />
        <Dropdown>
          <DropdownMenuTrigger asChild>
            <Button color="secondary" size="sm" StartIcon="ellipsis" className="dark:border-default px-2" />
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <DropdownItem
                  type="button"
                  href={`/reschedule/${booking.uid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  StartIcon="clock">
                  {t("reschedule_booking")}
                </DropdownItem>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <DropdownItem type="button" StartIcon="send" onClick={() => onRescheduleRequest(booking.uid)}>
                  {t("send_reschedule_request")}
                </DropdownItem>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <DropdownItem
                  type="button"
                  color="destructive"
                  StartIcon="x"
                  onClick={() => onCancel(booking)}>
                  {t("cancel_event")}
                </DropdownItem>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </Dropdown>
      </div>
    </div>
  );
});

const HolidaySection = memo(function HolidaySection({
  conflict,
  userTimeZone,
  userTimeFormat,
  onRescheduleRequest,
  onCancel,
}: {
  conflict: HolidayConflict;
  userTimeZone?: string;
  userTimeFormat?: number | null;
  onRescheduleRequest: (bookingUid: string) => void;
  onCancel: (booking: ConflictingBooking) => void;
}) {
  const formattedDate = dayjs(conflict.date).format("ddd, D MMM YYYY");

  return (
    <div className="mb-5 last:mb-0">
      {/* Holiday header */}
      <div className="mb-2 flex items-center gap-3">
        <HolidayEmojiBox holidayName={conflict.holidayName} />
        <div>
          <p className="text-emphasis text-sm font-semibold">{conflict.holidayName}</p>
          <p className="text-subtle dark:text-default text-xs">{formattedDate}</p>
        </div>
      </div>
      {/* Bookings list */}
      <div className="space-y-2">
        {conflict.bookings.map((booking) => (
          <BookingItem
            key={booking.id}
            booking={booking}
            userTimeZone={userTimeZone}
            userTimeFormat={userTimeFormat}
            onRescheduleRequest={onRescheduleRequest}
            onCancel={onCancel}
          />
        ))}
      </div>
    </div>
  );
});

export function HolidayConflictsDialog({
  isOpenDialog,
  setIsOpenDialog,
  conflicts,
  userTimeZone,
  userTimeFormat,
}: IHolidayConflictsDialog) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [rescheduleBookingUid, setRescheduleBookingUid] = useState<string | null>(null);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelBooking, setCancelBooking] = useState<ConflictingBooking | null>(null);

  const handleRescheduleRequest = (bookingUid: string) => {
    setRescheduleBookingUid(bookingUid);
    setRescheduleDialogOpen(true);
  };

  const handleCancel = (booking: ConflictingBooking) => {
    setCancelBooking(booking);
    setCancelDialogOpen(true);
  };

  // Handle side effects when dialogs close
  const handleCancelDialogChange: Dispatch<SetStateAction<boolean>> = (value) => {
    const newValue = typeof value === "function" ? value(cancelDialogOpen) : value;
    setCancelDialogOpen(newValue);
    if (!newValue) {
      setCancelBooking(null);
      utils.viewer.holidays.checkConflicts.invalidate();
    }
  };

  const handleRescheduleDialogChange: Dispatch<SetStateAction<boolean>> = (value) => {
    const newValue = typeof value === "function" ? value(rescheduleDialogOpen) : value;
    setRescheduleDialogOpen(newValue);
    if (!newValue) {
      setRescheduleBookingUid(null);
      utils.viewer.holidays.checkConflicts.invalidate();
    }
  };

  const totalBookings = conflicts.reduce((sum, c) => sum + c.bookings.length, 0);

  return (
    <>
      <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
        <DialogContent
          enableOverflow
          preventCloseOnOutsideClick
          className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader
            title={t("bookings_on_holidays")}
            subtitle={t("holiday_booking_conflict_warning", { count: totalBookings })}
          />
          <div className="mt-6 space-y-0">
            {conflicts.map((conflict, index) => (
              <div key={conflict.holidayId}>
                {index > 0 && <div className="border-subtle my-5 border-t" />}
                <HolidaySection
                  conflict={conflict}
                  userTimeZone={userTimeZone}
                  userTimeFormat={userTimeFormat}
                  onRescheduleRequest={handleRescheduleRequest}
                  onCancel={handleCancel}
                />
              </div>
            ))}
          </div>
          <DialogFooter showDivider className="mt-6">
            <Button color="secondary" onClick={() => setIsOpenDialog(false)}>
              {t("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {rescheduleBookingUid && (
        <RescheduleDialog
          isOpenDialog={rescheduleDialogOpen}
          setIsOpenDialog={handleRescheduleDialogChange}
          bookingUid={rescheduleBookingUid}
        />
      )}

      {cancelBooking && (
        <CancelBookingDialog
          isOpenDialog={cancelDialogOpen}
          setIsOpenDialog={handleCancelDialogChange}
          booking={{
            uid: cancelBooking.uid,
            id: cancelBooking.id,
            title: cancelBooking.title,
            startTime: new Date(cancelBooking.startTime),
          }}
          profile={{
            name: cancelBooking.hostName,
            slug: cancelBooking.hostUsername,
          }}
          recurringEvent={null}
          bookingCancelledEventProps={{
            booking: cancelBooking,
            organizer: {
              name: cancelBooking.hostName || "Organizer",
              email: cancelBooking.hostEmail || "",
            },
            eventType: null,
          }}
          isHost={true}
        />
      )}
    </>
  );
}
