import type { Booking } from "@/services/calcom";

export interface BookingListItemProps {
  booking: Booking;
  userEmail?: string;
  isConfirming: boolean;
  isDeclining: boolean;
  onPress: (booking: Booking) => void;
  onConfirm: (booking: Booking) => void;
  onReject: (booking: Booking) => void;
  onReschedule?: (booking: Booking) => void;
  onEditLocation?: (booking: Booking) => void;
  onAddGuests?: (booking: Booking) => void;
  onViewRecordings?: (booking: Booking) => void;
  onMeetingSessionDetails?: (booking: Booking) => void;
  onMarkNoShow?: (booking: Booking) => void;
  onReportBooking?: (booking: Booking) => void;
  onCancelBooking?: (booking: Booking) => void;
}
