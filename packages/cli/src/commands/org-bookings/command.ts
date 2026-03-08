import type { Command } from "commander";
import {
  organizationsBookingsControllerGetAllOrgTeamBookings as getOrgBookings,
  organizationsUsersBookingsControllerGetOrganizationUserBookings as getOrgUserBookings,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { ApiVersion } from "../../shared/constants";
import { withErrorHandling } from "../../shared/errors";
import { apiVersionHeader } from "../../shared/headers";
import { renderOrgBookingList } from "./output";
import type { BookingStatus, OrgBookingList, SortOrder } from "./types";

interface OrgBookingsListOptions {
  orgId: string;
  status?: string;
  attendeeEmail?: string;
  attendeeName?: string;
  eventTypeId?: string;
  afterStart?: string;
  beforeEnd?: string;
  take?: string;
  skip?: string;
  sortStart?: string;
  sortEnd?: string;
  sortCreated?: string;
  json?: boolean;
}

function registerOrgBookingsListCommand(orgBookingsCmd: Command): void {
  orgBookingsCmd
    .command("list")
    .description("List all organization bookings")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--status <status>", "Filter by status (upcoming,past,cancelled,recurring,unconfirmed)")
    .option("--attendee-email <email>", "Filter by attendee email")
    .option("--attendee-name <name>", "Filter by attendee name")
    .option("--event-type-id <id>", "Filter by event type ID")
    .option("--after-start <date>", "Filter bookings starting after this date (ISO 8601)")
    .option("--before-end <date>", "Filter bookings ending before this date (ISO 8601)")
    .option("--sort-start <order>", "Sort by start time (asc or desc)")
    .option("--sort-end <order>", "Sort by end time (asc or desc)")
    .option("--sort-created <order>", "Sort by creation time (asc or desc)")
    .option("--take <n>", "Number of bookings to return")
    .option("--skip <n>", "Number of bookings to skip")
    .option("--json", "Output as JSON")
    .action(async (options: OrgBookingsListOptions) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = Number(options.orgId);

        const statusArray = options.status ? [options.status as BookingStatus] : undefined;

        const { data: response } = await getOrgBookings({
          path: { orgId },
          query: {
            status: statusArray,
            attendeeEmail: options.attendeeEmail,
            attendeeName: options.attendeeName,
            eventTypeId: options.eventTypeId,
            afterStart: options.afterStart,
            beforeEnd: options.beforeEnd,
            sortStart: options.sortStart as SortOrder | undefined,
            sortEnd: options.sortEnd as SortOrder | undefined,
            sortCreated: options.sortCreated as SortOrder | undefined,
            take: options.take ? Number(options.take) : undefined,
            skip: options.skip ? Number(options.skip) : undefined,
          },
          headers: apiVersionHeader(ApiVersion.V2024_08_13),
        });

        renderOrgBookingList(response?.data, options);
      });
    });
}

function registerOrgUserBookingsCommand(orgBookingsCmd: Command): void {
  orgBookingsCmd
    .command("user <userId>")
    .description("List bookings for a specific user in the organization")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--status <status>", "Filter by status (upcoming,past,cancelled,recurring,unconfirmed)")
    .option("--attendee-email <email>", "Filter by attendee email")
    .option("--attendee-name <name>", "Filter by attendee name")
    .option("--event-type-id <id>", "Filter by event type ID")
    .option("--after-start <date>", "Filter bookings starting after this date (ISO 8601)")
    .option("--before-end <date>", "Filter bookings ending before this date (ISO 8601)")
    .option("--sort-start <order>", "Sort by start time (asc or desc)")
    .option("--sort-end <order>", "Sort by end time (asc or desc)")
    .option("--sort-created <order>", "Sort by creation time (asc or desc)")
    .option("--take <n>", "Number of bookings to return")
    .option("--skip <n>", "Number of bookings to skip")
    .option("--json", "Output as JSON")
    .action(async (userId: string, options: OrgBookingsListOptions) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = Number(options.orgId);

        const statusArray = options.status ? [options.status as BookingStatus] : undefined;

        const { data: response } = await getOrgUserBookings({
          path: { orgId, userId: Number(userId) },
          query: {
            status: statusArray,
            attendeeEmail: options.attendeeEmail,
            attendeeName: options.attendeeName,
            eventTypeId: options.eventTypeId,
            afterStart: options.afterStart,
            beforeEnd: options.beforeEnd,
            sortStart: options.sortStart as SortOrder | undefined,
            sortEnd: options.sortEnd as SortOrder | undefined,
            sortCreated: options.sortCreated as SortOrder | undefined,
            take: options.take ? Number(options.take) : undefined,
            skip: options.skip ? Number(options.skip) : undefined,
          },
          headers: apiVersionHeader(ApiVersion.V2024_08_13),
        });

        // Response type is unknown in the SDK, but the API returns GetBookingsOutput_2024_08_13 structure
        const bookingsData = response as { data?: OrgBookingList } | undefined;
        renderOrgBookingList(bookingsData?.data, options);
      });
    });
}

export function registerOrgBookingsCommand(program: Command): void {
  const orgBookingsCmd = program.command("org-bookings").description("Manage organization bookings");
  registerOrgBookingsListCommand(orgBookingsCmd);
  registerOrgUserBookingsCommand(orgBookingsCmd);
}
