import type { Booking } from "@/services/calcom";
import { formatDate, formatTime, getHostAndAttendeesDisplay } from "@/utils/bookings-utils";
import { getMeetingInfo } from "@/utils/meetings-utils";

export interface BookingListItemData {
  startTime: string;
  endTime: string;
  isUpcoming: boolean;
  isPending: boolean;
  isCancelled: boolean;
  isRejected: boolean;
  hostAndAttendeesDisplay: string | null;
  meetingInfo: ReturnType<typeof getMeetingInfo>;
  hasNoShowAttendee: boolean;
  formattedDate: string;
  formattedTimeRange: string;
}

/**
 * Extracts and computes derived data from a booking object.
 * This hook centralizes the logic shared between iOS and non-iOS BookingListItem components.
 */
export function useBookingListItemData(booking: Booking, userEmail?: string): BookingListItemData {
  const startTime = booking.start || booking.startTime || "";
  const endTime = booking.end || booking.endTime || "";
  const isUpcoming = new Date(endTime) >= new Date();
  const isPending = booking.status?.toLowerCase() === "pending";
  const isCancelled = booking.status?.toLowerCase() === "cancelled";
  const isRejected = booking.status?.toLowerCase() === "rejected";

  const hostAndAttendeesDisplay = getHostAndAttendeesDisplay(booking, userEmail);
  const meetingInfo = getMeetingInfo(booking.location);

  const hasNoShowAttendee =
    booking.attendees?.some(
      (att: { noShow?: boolean; absent?: boolean }) => att.noShow === true || att.absent === true
    ) ?? false;

  const formattedDate = formatDate(startTime, isUpcoming);
  const formattedTimeRange = `${formatTime(startTime)} - ${formatTime(endTime)}`;

  return {
    startTime,
    endTime,
    isUpcoming,
    isPending,
    isCancelled,
    isRejected,
    hostAndAttendeesDisplay,
    meetingInfo,
    hasNoShowAttendee,
    formattedDate,
    formattedTimeRange,
  };
}
