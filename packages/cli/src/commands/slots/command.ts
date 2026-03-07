import type { Command } from "commander";
import {
  slotsController20240904DeleteReservedSlot as deleteReservedSlot,
  slotsController20240904GetAvailableSlots as getAvailableSlots,
  slotsController20240904GetReservedSlot as getReservedSlot,
  slotsController20240904ReserveSlot as reserveSlot,
  slotsController20240904UpdateReservedSlot as updateReservedSlot,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { ApiVersion } from "../../shared/constants";
import { withErrorHandling } from "../../shared/errors";
import { apiVersionHeader } from "../../shared/headers";
import {
  renderAvailableSlots,
  renderGetReservedSlot,
  renderReservedSlot,
  renderSlotDeleted,
  renderSlotUpdated,
} from "./output";

export function registerSlotsCommand(program: Command): void {
  const slotsCmd = program.command("slots").description("Manage available slots");

  slotsCmd
    .command("available")
    .description("Get available slots")
    .requiredOption("--start <date>", "Start date/time (ISO 8601)")
    .requiredOption("--end <date>", "End date/time (ISO 8601)")
    .option("--event-type-id <id>", "Event type ID")
    .option("--event-type-slug <slug>", "Event type slug")
    .option("--username <username>", "Username (required with event-type-slug)")
    .option("--timezone <tz>", "Timezone")
    .option("--duration <minutes>", "Duration override in minutes")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        start: string;
        end: string;
        eventTypeId?: string;
        eventTypeSlug?: string;
        username?: string;
        timezone?: string;
        duration?: string;
        json?: boolean;
      }) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const { data: slotsData } = await getAvailableSlots({
            query: {
              start: options.start,
              end: options.end,
              eventTypeId: options.eventTypeId ? Number(options.eventTypeId) : undefined,
              eventTypeSlug: options.eventTypeSlug,
              username: options.username,
              timeZone: options.timezone,
              duration: options.duration ? Number(options.duration) : undefined,
            },
            headers: apiVersionHeader(ApiVersion.V2024_09_04),
          });

          renderAvailableSlots(slotsData, options);
        });
      }
    );

  slotsCmd
    .command("reserve")
    .description("Reserve a slot")
    .requiredOption("--event-type-id <id>", "Event type ID")
    .requiredOption("--slot-start <datetime>", "Slot start (ISO 8601 UTC)")
    .option("--slot-duration <minutes>", "Slot duration in minutes")
    .option("--reservation-duration <minutes>", "Reservation duration in minutes (default: 5)")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        eventTypeId: string;
        slotStart: string;
        slotDuration?: string;
        reservationDuration?: string;
        json?: boolean;
      }) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const { data: response } = await reserveSlot({
            body: {
              eventTypeId: Number(options.eventTypeId),
              slotStart: options.slotStart,
              slotDuration: options.slotDuration ? Number(options.slotDuration) : undefined,
              reservationDuration: options.reservationDuration
                ? Number(options.reservationDuration)
                : undefined,
            },
            headers: apiVersionHeader(ApiVersion.V2024_09_04),
          });

          renderReservedSlot(response?.data, options);
        });
      }
    );

  slotsCmd
    .command("get <uid>")
    .description("Get a reserved slot by UID")
    .option("--json", "Output as JSON")
    .action(async (uid: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getReservedSlot({
          path: { uid },
          headers: apiVersionHeader(ApiVersion.V2024_09_04),
        });

        renderGetReservedSlot(response?.data, options);
      });
    });

  slotsCmd
    .command("update <uid>")
    .description("Update a reserved slot")
    .requiredOption("--event-type-id <id>", "Event type ID")
    .requiredOption("--slot-start <datetime>", "Slot start (ISO 8601 UTC)")
    .option("--slot-duration <minutes>", "Slot duration in minutes")
    .option("--reservation-duration <minutes>", "Reservation duration in minutes")
    .option("--json", "Output as JSON")
    .action(
      async (
        uid: string,
        options: {
          eventTypeId: string;
          slotStart: string;
          slotDuration?: string;
          reservationDuration?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const { data: response } = await updateReservedSlot({
            path: { uid },
            body: {
              eventTypeId: Number(options.eventTypeId),
              slotStart: options.slotStart,
              slotDuration: options.slotDuration ? Number(options.slotDuration) : undefined,
              reservationDuration: options.reservationDuration
                ? Number(options.reservationDuration)
                : undefined,
            },
            headers: apiVersionHeader(ApiVersion.V2024_09_04),
          });

          renderSlotUpdated(response?.data, options);
        });
      }
    );

  slotsCmd
    .command("delete <uid>")
    .description("Delete a reserved slot")
    .option("--json", "Output as JSON")
    .action(async (uid: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        await deleteReservedSlot({
          path: { uid },
          headers: apiVersionHeader(ApiVersion.V2024_09_04),
        });

        renderSlotDeleted(uid, options);
      });
    });
}
