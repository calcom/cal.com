import {
  formatDateShort,
  formatTimeRange,
  type OutputOptions,
  renderDetail,
  renderHeader,
  renderTable,
} from "../../shared/output";
import type { OrgBooking, OrgBookingList } from "./types";

function renderOrgBookingDetail(booking: OrgBooking): void {
  renderHeader(`Booking: ${booking.title}`);
  renderDetail([
    ["UID:", booking.uid],
    ["Status:", booking.status],
    ["Start:", new Date(booking.start).toLocaleString()],
    ["End:", new Date(booking.end).toLocaleString()],
    ["Duration:", `${booking.duration} min`],
    ["Location:", booking.location],
    ["Meeting:", booking.meetingUrl],
    ["Attendees:", booking.attendees?.length ? `${booking.attendees.length} attendee(s)` : undefined],
  ]);
}

export function renderOrgBookingList(
  bookings: OrgBookingList | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(bookings, null, 2));
    return;
  }

  if (!bookings?.length) {
    console.log("No organization bookings found.");
    return;
  }

  renderTable(
    ["UID", "Title", "Date", "Time", "Status", "Attendees"],
    bookings.map((booking) => {
      const attendees = booking.attendees?.map((a) => a.name || a.email).join(", ") || "";
      return [
        booking.uid.substring(0, 8),
        booking.title || "",
        formatDateShort(booking.start),
        formatTimeRange(booking.start, booking.end),
        booking.status || "",
        attendees,
      ];
    })
  );
}

export function renderOrgBooking(booking: OrgBooking | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(booking, null, 2));
    return;
  }

  if (!booking) {
    console.log("Booking not found.");
    return;
  }

  renderOrgBookingDetail(booking);
}
