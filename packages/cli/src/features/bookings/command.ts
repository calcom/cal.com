import type { Command } from "commander";
import {
  bookingsController20240813CancelBooking as cancelBooking,
  bookingsController20240813ConfirmBooking as confirmBooking,
  bookingsController20240813CreateBooking as createBooking,
  bookingsController20240813DeclineBooking as declineBooking,
  bookingsController20240813GetBooking as getBooking,
  bookingsController20240813GetBookings as getBookings,
  bookingsController20240813ReassignBooking as reassignBooking,
  bookingsController20240813RescheduleBooking as rescheduleBooking,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { ApiVersion } from "../../shared/constants";
import { withErrorHandling } from "../../shared/errors";
import { apiVersionHeader } from "../../shared/headers";
import {
  renderBooking,
  renderBookingAction,
  renderBookingCreated,
  renderBookingList,
  renderBookingRescheduled,
} from "./output";
import type { BookingStatus } from "./types";

function registerBookingQueryCommands(bookingsCmd: Command): void {
  bookingsCmd
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
        await withErrorHandling(async () => {
          await initializeClient();

          const statusArray = options.status ? [options.status as BookingStatus] : undefined;

          const { data: response } = await getBookings({
            query: {
              status: statusArray,
              attendeeEmail: options.attendeeEmail,
              eventTypeId: options.eventTypeId,
              eventTypeIds: options.eventTypeIds,
              teamsIds: options.teamsIds,
              afterStart: options.afterStart,
              beforeEnd: options.beforeEnd,
              sortStart: options.sortStart as "asc" | "desc" | undefined,
              sortEnd: options.sortEnd as "asc" | "desc" | undefined,
              sortCreated: options.sortCreated as "asc" | "desc" | undefined,
              take: options.take ? Number(options.take) : undefined,
              skip: options.skip ? Number(options.skip) : undefined,
            },
            headers: apiVersionHeader(ApiVersion.V2024_08_13),
          });

          renderBookingList(response?.data, options);
        });
      }
    );

  bookingsCmd
    .command("get <bookingUid>")
    .description("Get a booking by UID")
    .option("--json", "Output as JSON")
    .action(async (bookingUid: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getBooking({
          path: { bookingUid },
          headers: apiVersionHeader(ApiVersion.V2024_08_13),
        });

        renderBooking(response?.data, options);
      });
    });
}

function registerBookingCreateCommand(bookingsCmd: Command): void {
  bookingsCmd
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
        await withErrorHandling(async () => {
          await initializeClient();

          const { data: response } = await createBooking({
            body: {
              start: options.start,
              eventTypeId: Number(options.eventTypeId),
              attendee: {
                name: options.attendeeName,
                email: options.attendeeEmail,
                timeZone: options.attendeeTimezone,
                language: options.attendeeLanguage as "en",
              },
              meetingUrl: options.meetingUrl,
            },
            headers: apiVersionHeader(ApiVersion.V2024_08_13),
          });

          renderBookingCreated(response?.data, options);
        });
      }
    );
}

function registerBookingActionCommands(bookingsCmd: Command): void {
  bookingsCmd
    .command("cancel <bookingUid>")
    .description("Cancel a booking")
    .option("--reason <reason>", "Cancellation reason")
    .option("--json", "Output as JSON")
    .action(async (bookingUid: string, options: { reason?: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await cancelBooking({
          path: { bookingUid },
          body: { cancellationReason: options.reason },
          headers: apiVersionHeader(ApiVersion.V2024_08_13),
        });

        renderBookingAction("cancelled", bookingUid, response, options);
      });
    });

  bookingsCmd
    .command("reschedule <bookingUid>")
    .description("Reschedule a booking")
    .requiredOption("--start <datetime>", "New start time (ISO 8601 UTC)")
    .option("--reason <reason>", "Reschedule reason")
    .option("--json", "Output as JSON")
    .action(async (bookingUid: string, options: { start: string; reason?: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await rescheduleBooking({
          path: { bookingUid },
          body: {
            start: options.start,
            reschedulingReason: options.reason,
          },
          headers: apiVersionHeader(ApiVersion.V2024_08_13),
        });

        renderBookingRescheduled(response?.data, options);
      });
    });

  bookingsCmd
    .command("confirm <bookingUid>")
    .description("Confirm a booking")
    .option("--json", "Output as JSON")
    .action(async (bookingUid: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await confirmBooking({
          path: { bookingUid },
          headers: apiVersionHeader(ApiVersion.V2024_08_13),
        });

        renderBookingAction("confirmed", bookingUid, response, options);
      });
    });

  bookingsCmd
    .command("decline <bookingUid>")
    .description("Decline a booking")
    .option("--reason <reason>", "Decline reason")
    .option("--json", "Output as JSON")
    .action(async (bookingUid: string, options: { reason?: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await declineBooking({
          path: { bookingUid },
          body: { reason: options.reason },
          headers: apiVersionHeader(ApiVersion.V2024_08_13),
        });

        renderBookingAction("declined", bookingUid, response, options);
      });
    });

  bookingsCmd
    .command("reassign <bookingUid>")
    .description("Reassign a booking (round-robin)")
    .option("--json", "Output as JSON")
    .action(async (bookingUid: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await reassignBooking({
          path: { bookingUid },
          headers: apiVersionHeader(ApiVersion.V2024_08_13),
        });

        renderBookingAction("reassigned", bookingUid, response, options);
      });
    });
}

export function registerBookingsCommand(program: Command): void {
  const bookingsCmd = program.command("bookings").description("Manage bookings");
  registerBookingQueryCommands(bookingsCmd);
  registerBookingCreateCommand(bookingsCmd);
  registerBookingActionCommands(bookingsCmd);
}
