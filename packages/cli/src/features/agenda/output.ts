import chalk from "chalk";
import { formatDateShort, formatTimeRange, renderTable, type OutputOptions } from "../../shared/output";
import type { Booking } from "../bookings/types";

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

export function renderAgenda(bookings: Booking[] | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(bookings, null, 2));
    return;
  }

  if (!bookings || bookings.length === 0) {
    console.log(chalk.dim("No upcoming bookings."));
    return;
  }

  console.log(chalk.bold("\nUpcoming Bookings\n"));
  renderTable(["Date", "Time", "Title", "Attendees", "Location"], bookings.map(formatAgendaRow));
  console.log();
}
