import type { Command } from "commander";
import {
  bookingAttendeesController20240813AddAttendee as addAttendee,
  bookingAttendeesController20240813GetBookingAttendees as getBookingAttendees,
  bookingAttendeesController20240813GetBookingAttendee as getBookingAttendee,
  bookingGuestsController20240813AddGuests as addGuests,
  bookingsController20240813CancelBooking as cancelBooking,
  bookingsController20240813ConfirmBooking as confirmBooking,
  bookingsController20240813CreateBooking as createBooking,
  bookingsController20240813DeclineBooking as declineBooking,
  bookingsController20240813GetBooking as getBooking,
  bookingsController20240813GetBookingBySeatUid as getBookingBySeatUid,
  bookingsController20240813GetBookingRecordings as getBookingRecordings,
  bookingsController20240813GetBookingReferences as getBookingReferences,
  bookingsController20240813GetBookings as getBookings,
  bookingsController20240813GetBookingTranscripts as getBookingTranscripts,
  bookingsController20240813GetCalendarLinks as getCalendarLinks,
  bookingsController20240813GetVideoSessions as getVideoSessions,
  bookingsController20240813MarkNoShow as markNoShow,
  bookingsController20240813ReassignBooking as reassignBooking,
  bookingsController20240813ReassignBookingToUser as reassignBookingToUser,
  bookingsController20240813RescheduleBooking as rescheduleBooking,
  bookingLocationController20240813UpdateBookingLocation as updateBookingLocation,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { ApiVersion } from "../../shared/constants";
import { withErrorHandling } from "../../shared/errors";
import { apiVersionHeader } from "../../shared/headers";
import {
  renderBooking,
  renderBookingAction,
  renderBookingAttendee,
  renderBookingAttendees,
  renderBookingCreated,
  renderBookingList,
  renderBookingRecordings,
  renderBookingReferences,
  renderBookingRescheduled,
  renderBookingTranscripts,
  renderCalendarLinks,
  renderVideoSessions,
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
    .option("--team-ids <ids>", "Filter by team IDs (comma-separated)")
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
        teamIds?: string;
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
              teamsIds: options.teamIds,
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

  bookingsCmd
    .command("recordings <bookingUid>")
    .description("Get recordings for a booking")
    .option("--json", "Output as JSON")
    .action(async (bookingUid: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getBookingRecordings({
          path: { bookingUid },
          headers: apiVersionHeader(ApiVersion.V2024_08_13),
        });

        renderBookingRecordings(response?.data, options);
      });
    });

  bookingsCmd
    .command("transcripts <bookingUid>")
    .description("Get transcripts for a booking")
    .option("--json", "Output as JSON")
    .action(async (bookingUid: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getBookingTranscripts({
          path: { bookingUid },
          headers: apiVersionHeader(ApiVersion.V2024_08_13),
        });

        renderBookingTranscripts(response?.data, options);
      });
    });

  bookingsCmd
    .command("by-seat <seatUid>")
    .description("Get a booking by seat UID")
    .option("--json", "Output as JSON")
    .action(async (seatUid: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getBookingBySeatUid({
          path: { seatUid },
          headers: apiVersionHeader(ApiVersion.V2024_08_13),
        });

        renderBooking(response?.data, options);
      });
    });

  bookingsCmd
    .command("references <bookingUid>")
    .description("Get references for a booking")
    .option("--json", "Output as JSON")
    .action(async (bookingUid: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getBookingReferences({
          path: { bookingUid },
          headers: apiVersionHeader(ApiVersion.V2024_08_13),
        });

        renderBookingReferences(response?.data, options);
      });
    });

  bookingsCmd
    .command("calendar-links <bookingUid>")
    .description("Get calendar links for a booking")
    .option("--json", "Output as JSON")
    .action(async (bookingUid: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getCalendarLinks({
          path: { bookingUid },
          headers: apiVersionHeader(ApiVersion.V2024_08_13),
        });

        renderCalendarLinks(response?.data, options);
      });
    });

  bookingsCmd
    .command("video-sessions <bookingUid>")
    .description("Get video sessions for a booking (Cal Video only)")
    .option("--json", "Output as JSON")
    .action(async (bookingUid: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getVideoSessions({
          path: { bookingUid },
          headers: apiVersionHeader(ApiVersion.V2024_08_13),
        });

        renderVideoSessions(response?.data, options);
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
    .requiredOption("--attendee-timezone <tz>", "Attendee timezone")
    .option("--attendee-email <email>", "Attendee email")
    .option("--attendee-phone <phone>", "Attendee phone number (international format)")
    .option("--attendee-language <lang>", "Attendee language (default: en)", "en")
    .option("--meeting-url <url>", "Meeting URL (deprecated, use --location)")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        start: string;
        eventTypeId: string;
        attendeeName: string;
        attendeeTimezone: string;
        attendeeEmail?: string;
        attendeePhone?: string;
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
                timeZone: options.attendeeTimezone,
                email: options.attendeeEmail,
                phoneNumber: options.attendeePhone,
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

  bookingsCmd
    .command("reassign-to-user <bookingUid>")
    .description("Reassign a booking to a specific user")
    .requiredOption("--user-id <userId>", "User ID to reassign to")
    .option("--reason <reason>", "Reassignment reason")
    .option("--json", "Output as JSON")
    .action(async (bookingUid: string, options: { userId: string; reason?: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await reassignBookingToUser({
          path: { bookingUid, userId: Number(options.userId) },
          body: { reason: options.reason },
          headers: apiVersionHeader(ApiVersion.V2024_08_13),
        });

        renderBookingAction("reassigned", bookingUid, response, options);
      });
    });

  bookingsCmd
    .command("mark-no-show <bookingUid>")
    .description("Mark an attendee as no-show")
    .requiredOption("--attendee <email>", "Attendee email to mark as no-show")
    .option("--no-show <value>", "No-show status (true/false)", "true")
    .option("--json", "Output as JSON")
    .action(async (bookingUid: string, options: { attendee: string; noShow: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await markNoShow({
          path: { bookingUid },
          body: {
            attendees: [{ email: options.attendee, absent: options.noShow === "true" }],
          },
          headers: apiVersionHeader(ApiVersion.V2024_08_13),
        });

        renderBookingAction("marked as no-show", bookingUid, response, options);
      });
    });

  bookingsCmd
    .command("attendees <bookingUid>")
    .description("List attendees for a booking")
    .option("--json", "Output as JSON")
    .action(async (bookingUid: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getBookingAttendees({
          path: { bookingUid },
          headers: apiVersionHeader(ApiVersion.V2024_08_13),
        });

        renderBookingAttendees(response?.data, options);
      });
    });

  bookingsCmd
    .command("attendee <bookingUid> <attendeeId>")
    .description("Get a specific attendee for a booking")
    .option("--json", "Output as JSON")
    .action(async (bookingUid: string, attendeeId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getBookingAttendee({
          path: { bookingUid, attendeeId: Number(attendeeId) },
          headers: apiVersionHeader(ApiVersion.V2024_08_13),
        });

        renderBookingAttendee(response?.data, options);
      });
    });

  bookingsCmd
    .command("add-attendee <bookingUid>")
    .description("Add an attendee to a booking")
    .requiredOption("--name <name>", "Attendee name")
    .requiredOption("--email <email>", "Attendee email")
    .requiredOption("--timezone <tz>", "Attendee timezone")
    .option("--language <lang>", "Attendee language", "en")
    .option("--json", "Output as JSON")
    .action(
      async (
        bookingUid: string,
        options: { name: string; email: string; timezone: string; language: string; json?: boolean }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const { data: response } = await addAttendee({
            path: { bookingUid },
            body: {
              name: options.name,
              email: options.email,
              timeZone: options.timezone,
              language: options.language as "en",
            },
            headers: apiVersionHeader(ApiVersion.V2024_08_13),
          });

          renderBookingAction("attendee added", bookingUid, response, options);
        });
      }
    );

  bookingsCmd
    .command("add-guests <bookingUid>")
    .description("Add guests to a booking")
    .requiredOption("--guests <emails>", "Guest emails (comma-separated)")
    .option("--json", "Output as JSON")
    .action(async (bookingUid: string, options: { guests: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const guests = options.guests.split(",").map((email) => ({ email: email.trim() }));

        const { data: response } = await addGuests({
          path: { bookingUid },
          body: { guests },
          headers: apiVersionHeader(ApiVersion.V2024_08_13),
        });

        renderBookingAction("guests added", bookingUid, response, options);
      });
    });

  bookingsCmd
    .command("update-location <bookingUid>")
    .description("Update booking location")
    .requiredOption("--location <location>", "New location (link URL)")
    .option("--json", "Output as JSON")
    .action(async (bookingUid: string, options: { location: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await updateBookingLocation({
          path: { bookingUid },
          body: {
            location: { type: "link", link: options.location },
          },
          headers: apiVersionHeader(ApiVersion.V2024_08_13),
        });

        renderBookingAction("location updated", bookingUid, response, options);
      });
    });
}

export function registerBookingsCommand(program: Command): void {
  const bookingsCmd = program.command("bookings").description("Manage bookings");
  registerBookingQueryCommands(bookingsCmd);
  registerBookingCreateCommand(bookingsCmd);
  registerBookingActionCommands(bookingsCmd);
}
