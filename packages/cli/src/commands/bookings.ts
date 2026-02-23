import chalk from "chalk";
import type { Command } from "commander";
import { apiRequest } from "../lib/api";
import { handleOutput, outputError, outputSuccess, outputTable } from "../lib/output";

interface BookingAttendee {
  name: string;
  email: string;
  timeZone: string;
}

interface Booking {
  id: number;
  uid: string;
  title: string;
  status: string;
  start: string;
  end: string;
  duration: number;
  eventTypeId: number;
  attendees: BookingAttendee[];
  hosts: Array<{ id: number; name: string }>;
  meetingUrl?: string;
  location?: string;
}

function formatBookingRow(booking: Booking): string[] {
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
}

function formatBookingDetail(booking: Booking): void {
  console.log(chalk.bold(`\nBooking: ${booking.title}`));
  console.log(`  UID:        ${booking.uid}`);
  console.log(`  Status:     ${booking.status}`);
  console.log(`  Start:      ${new Date(booking.start).toLocaleString()}`);
  console.log(`  End:        ${new Date(booking.end).toLocaleString()}`);
  console.log(`  Duration:   ${booking.duration} min`);
  if (booking.location) {
    console.log(`  Location:   ${booking.location}`);
  }
  if (booking.meetingUrl) {
    console.log(`  Meeting:    ${booking.meetingUrl}`);
  }
  if (booking.attendees?.length) {
    console.log(`  Attendees:`);
    for (const a of booking.attendees) {
      console.log(`    - ${a.name} <${a.email}> (${a.timeZone})`);
    }
  }
  console.log();
}

function registerBookingQueryCommands(bookings: Command): void {
  bookings
    .command("list")
    .description("List all bookings")
    .option("--status <status>", "Filter by status (upcoming,past,cancelled,recurring,unconfirmed)")
    .option("--attendee-email <email>", "Filter by attendee email")
    .option("--event-type-id <id>", "Filter by event type ID")
    .option("--event-type-ids <ids>", "Filter by event type IDs (comma-separated)")
    .option("--teams-ids <ids>", "Filter by team IDs (comma-separated)")
    .option("--after-start <date>", "Filter bookings starting after this date (ISO 8601)")
    .option("--before-end <date>", "Filter bookings ending before this date (ISO 8601)")
    .option("--sort-start <order>", "Sort by start time (asc or desc)")
    .option("--sort-end <order>", "Sort by end time (asc or desc)")
    .option("--sort-created <order>", "Sort by creation time (asc or desc)")
    .option("--take <n>", "Number of bookings to return")
    .option("--skip <n>", "Number of bookings to skip")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        status?: string;
        attendeeEmail?: string;
        eventTypeId?: string;
        eventTypeIds?: string;
        teamsIds?: string;
        afterStart?: string;
        beforeEnd?: string;
        sortStart?: string;
        sortEnd?: string;
        sortCreated?: string;
        take?: string;
        skip?: string;
        json?: boolean;
      }) => {
        const query: Record<string, string | undefined> = {};
        if (options.status) query.status = options.status;
        if (options.attendeeEmail) query.attendeeEmail = options.attendeeEmail;
        if (options.eventTypeId) query.eventTypeId = options.eventTypeId;
        if (options.eventTypeIds) query.eventTypeIds = options.eventTypeIds;
        if (options.teamsIds) query.teamsIds = options.teamsIds;
        if (options.afterStart) query.afterStart = options.afterStart;
        if (options.beforeEnd) query.beforeEnd = options.beforeEnd;
        if (options.sortStart) query.sortStart = options.sortStart;
        if (options.sortEnd) query.sortEnd = options.sortEnd;
        if (options.sortCreated) query.sortCreated = options.sortCreated;
        if (options.take) query.take = options.take;
        if (options.skip) query.skip = options.skip;

        const response = await apiRequest<Booking[]>("/v2/bookings", { query });

        handleOutput(response.data, options, (data) => {
          if (!data || data.length === 0) {
            console.log("No bookings found.");
            return;
          }
          outputTable(["UID", "Title", "Date", "Time", "Status", "Attendees"], data.map(formatBookingRow));
        });
      }
    );

  bookings
    .command("get <bookingUid>")
    .description("Get a booking by UID")
    .option("--json", "Output as JSON")
    .action(async (bookingUid: string, options: { json?: boolean }) => {
      const response = await apiRequest<Booking>(`/v2/bookings/${bookingUid}`);

      handleOutput(response.data, options, (data) => {
        if (!data) {
          outputError("Booking not found.");
          return;
        }
        formatBookingDetail(data);
      });
    });
}

function registerBookingCreateCommand(bookings: Command): void {
  bookings
    .command("create")
    .description("Create a booking")
    .requiredOption("--start <datetime>", "Start time (ISO 8601 UTC)")
    .requiredOption("--event-type-id <id>", "Event type ID")
    .requiredOption("--attendee-name <name>", "Attendee name")
    .requiredOption("--attendee-email <email>", "Attendee email")
    .requiredOption("--attendee-timezone <tz>", "Attendee timezone")
    .option("--attendee-language <lang>", "Attendee language (default: en)", "en")
    .option("--meeting-url <url>", "Meeting URL")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        start: string;
        eventTypeId: string;
        attendeeName: string;
        attendeeEmail: string;
        attendeeTimezone: string;
        attendeeLanguage: string;
        meetingUrl?: string;
        json?: boolean;
      }) => {
        const body: Record<string, unknown> = {
          start: options.start,
          eventTypeId: Number(options.eventTypeId),
          attendee: {
            name: options.attendeeName,
            email: options.attendeeEmail,
            timeZone: options.attendeeTimezone,
            language: options.attendeeLanguage,
          },
        };
        if (options.meetingUrl) {
          body.meetingUrl = options.meetingUrl;
        }

        const response = await apiRequest<Booking>("/v2/bookings", {
          method: "POST",
          body,
        });

        handleOutput(response.data, options, (data) => {
          if (!data) {
            outputError("Failed to create booking.");
            return;
          }
          outputSuccess(`Booking created: ${data.uid}`);
          formatBookingDetail(data);
        });
      }
    );
}

function registerBookingActionCommands(bookings: Command): void {
  bookings
    .command("cancel <bookingUid>")
    .description("Cancel a booking")
    .option("--reason <reason>", "Cancellation reason")
    .option("--json", "Output as JSON")
    .action(async (bookingUid: string, options: { reason?: string; json?: boolean }) => {
      const body: Record<string, unknown> = {};
      if (options.reason) {
        body.cancellationReason = options.reason;
      }

      const response = await apiRequest<Booking>(`/v2/bookings/${bookingUid}/cancel`, {
        method: "POST",
        body,
      });

      handleOutput(response.data, options, () => {
        outputSuccess(`Booking ${bookingUid} cancelled.`);
      });
    });

  bookings
    .command("reschedule <bookingUid>")
    .description("Reschedule a booking")
    .requiredOption("--start <datetime>", "New start time (ISO 8601 UTC)")
    .option("--reason <reason>", "Reschedule reason")
    .option("--json", "Output as JSON")
    .action(async (bookingUid: string, options: { start: string; reason?: string; json?: boolean }) => {
      const body: Record<string, unknown> = {
        start: options.start,
      };
      if (options.reason) {
        body.reschedulingReason = options.reason;
      }

      const response = await apiRequest<Booking>(`/v2/bookings/${bookingUid}/reschedule`, {
        method: "POST",
        body,
      });

      handleOutput(response.data, options, (data) => {
        if (!data) {
          outputError("Failed to reschedule booking.");
          return;
        }
        outputSuccess(`Booking rescheduled. New UID: ${data.uid}`);
        formatBookingDetail(data);
      });
    });

  bookings
    .command("confirm <bookingUid>")
    .description("Confirm a booking")
    .option("--json", "Output as JSON")
    .action(async (bookingUid: string, options: { json?: boolean }) => {
      const response = await apiRequest<Booking>(`/v2/bookings/${bookingUid}/confirm`, {
        method: "POST",
        body: {},
      });

      handleOutput(response.data, options, () => {
        outputSuccess(`Booking ${bookingUid} confirmed.`);
      });
    });

  bookings
    .command("decline <bookingUid>")
    .description("Decline a booking")
    .option("--reason <reason>", "Decline reason")
    .option("--json", "Output as JSON")
    .action(async (bookingUid: string, options: { reason?: string; json?: boolean }) => {
      const body: Record<string, unknown> = {};
      if (options.reason) {
        body.reason = options.reason;
      }

      const response = await apiRequest<Booking>(`/v2/bookings/${bookingUid}/decline`, {
        method: "POST",
        body,
      });

      handleOutput(response.data, options, () => {
        outputSuccess(`Booking ${bookingUid} declined.`);
      });
    });

  bookings
    .command("reassign <bookingUid>")
    .description("Reassign a booking (round-robin)")
    .option("--json", "Output as JSON")
    .action(async (bookingUid: string, options: { json?: boolean }) => {
      const response = await apiRequest<Booking>(`/v2/bookings/${bookingUid}/reassign`, {
        method: "POST",
        body: {},
      });

      handleOutput(response.data, options, () => {
        outputSuccess(`Booking ${bookingUid} reassigned.`);
      });
    });
}

export function registerBookingsCommand(program: Command): void {
  const bookings = program.command("bookings").description("Manage bookings");
  registerBookingQueryCommands(bookings);
  registerBookingCreateCommand(bookings);
  registerBookingActionCommands(bookings);
}
