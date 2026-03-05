import chalk from "chalk";
import { renderSuccess, renderTable } from "../../shared/output";
import type { Booking, BookingResponse, CreateBookingResponse, RescheduleBookingResponse } from "./types";

interface OutputOptions {
  json?: boolean;
}

function normalizeBooking(
  data: BookingResponse | CreateBookingResponse | RescheduleBookingResponse | undefined
): Booking | undefined {
  if (!data) return undefined;
  if (Array.isArray(data)) return data[0] as Booking;
  return data as Booking;
}

function renderBookingDetail(booking: Booking): void {
  console.log(chalk.bold(`\nBooking: ${booking.title}`));
  console.log(`  UID:        ${booking.uid}`);
  console.log(`  Status:     ${booking.status}`);
  console.log(`  Start:      ${new Date(booking.start).toLocaleString()}`);
  console.log(`  End:        ${new Date(booking.end).toLocaleString()}`);
  console.log(`  Duration:   ${booking.duration} min`);
  if (booking.location) console.log(`  Location:   ${booking.location}`);
  if (booking.meetingUrl) console.log(`  Meeting:    ${booking.meetingUrl}`);
  if (booking.attendees?.length) console.log(`  Attendees:  ${booking.attendees.length} attendee(s)`);
  console.log();
}

export function renderBooking(data: BookingResponse | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const booking = normalizeBooking(data);

  if (!booking) {
    console.log("Booking not found.");
    return;
  }

  renderBookingDetail(booking);
}

export function renderBookingList(bookings: Booking[] | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(bookings, null, 2));
    return;
  }

  if (!bookings?.length) {
    console.log("No bookings found.");
    return;
  }

  renderTable(
    ["UID", "Title", "Date", "Time", "Status", "Attendees"],
    bookings.map((booking) => {
      const start = new Date(booking.start);
      const end = new Date(booking.end);
      const dateStr = start.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const timeStr = `${start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
      const attendees = booking.attendees?.map((a) => a.name || a.email).join(", ") || "";

      return [
        booking.uid.substring(0, 8),
        booking.title || "",
        dateStr,
        timeStr,
        booking.status || "",
        attendees,
      ];
    })
  );
}

export function renderBookingCreated(data: CreateBookingResponse | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const booking = normalizeBooking(data);

  if (!booking) {
    console.log("Failed to create booking.");
    return;
  }

  renderSuccess(`Booking created: ${booking.uid}`);
  renderBookingDetail(booking);
}

export function renderBookingRescheduled(
  data: RescheduleBookingResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const booking = normalizeBooking(data);

  if (!booking) {
    console.log("Failed to reschedule booking.");
    return;
  }

  renderSuccess(`Booking rescheduled. New UID: ${booking.uid}`);
  renderBookingDetail(booking);
}

export function renderBookingAction(
  action: string,
  bookingUid: string,
  response: unknown,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }

  renderSuccess(`Booking ${bookingUid} ${action}.`);
}
