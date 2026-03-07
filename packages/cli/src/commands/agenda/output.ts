import chalk from "chalk";
import { formatDateShort, formatTimeRange, type OutputOptions, renderHeader, renderTable, renderWarning } from "../../shared/output";
import type { Booking, BookingList } from "../bookings/types";

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === now.toDateString()) {
    return chalk.green("Today");
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return chalk.yellow("Tomorrow");
  }
  return formatDateShort(date);
}

function formatAgendaRow(booking: Booking): string[] {
  const attendees = booking.attendees?.map((a) => a.name || a.email).join(", ") || "";
  return [
    formatRelativeDate(booking.start),
    formatTimeRange(booking.start, booking.end),
    booking.title || "",
    attendees,
    booking.location || "",
  ];
}

export function renderAgenda(bookings: BookingList | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(bookings, null, 2));
    return;
  }

  if (!bookings || bookings.length === 0) {
    renderWarning("No upcoming bookings.");
    return;
  }

  renderHeader("Upcoming Bookings");
  renderTable(["Date", "Time", "Title", "Attendees", "Location"], bookings.map(formatAgendaRow));
}
