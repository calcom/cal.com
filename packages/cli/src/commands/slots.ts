import type { Command } from "commander";
import { apiRequest } from "../lib/api";
import { API_VERSION } from "../lib/constants";
import { handleOutput, outputError, outputSuccess, outputTable } from "../lib/output";

interface Slot {
  start: string;
}

type AvailableSlotsResponse = Record<string, Slot[]>;

interface ReservedSlot {
  uid: string;
  slotStart: string;
  slotEnd: string;
}

export function registerSlotsCommand(program: Command): void {
  const slots = program.command("slots").description("Manage available slots");

  slots
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
        const query: Record<string, string | undefined> = {
          start: options.start,
          end: options.end,
        };
        if (options.eventTypeId) query.eventTypeId = options.eventTypeId;
        if (options.eventTypeSlug) query.eventTypeSlug = options.eventTypeSlug;
        if (options.username) query.username = options.username;
        if (options.timezone) query.timeZone = options.timezone;
        if (options.duration) query.duration = options.duration;

        const response = await apiRequest<AvailableSlotsResponse>("/v2/slots", {
          query,
          apiVersion: API_VERSION.V_2024_09_04,
        });

        handleOutput(response.data, options, (data) => {
          if (!data || Object.keys(data).length === 0) {
            console.log("No available slots found.");
            return;
          }
          const rows: string[][] = [];
          for (const [date, dateSlots] of Object.entries(data)) {
            for (const slot of dateSlots) {
              rows.push([
                date,
                new Date(slot.start).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
              ]);
            }
          }
          outputTable(["Date", "Time"], rows);
        });
      }
    );

  slots
    .command("reserve")
    .description("Reserve a slot")
    .requiredOption("--event-type-id <id>", "Event type ID")
    .requiredOption("--slot-start <datetime>", "Slot start (ISO 8601 UTC)")
    .requiredOption("--slot-end <datetime>", "Slot end (ISO 8601 UTC)")
    .option("--json", "Output as JSON")
    .action(async (options: { eventTypeId: string; slotStart: string; slotEnd: string; json?: boolean }) => {
      const body: Record<string, unknown> = {
        eventTypeId: Number(options.eventTypeId),
        slotStart: options.slotStart,
        slotEnd: options.slotEnd,
      };

      const response = await apiRequest<ReservedSlot>("/v2/slots/reservations", {
        method: "POST",
        body,
        apiVersion: API_VERSION.V_2024_09_04,
      });

      handleOutput(response.data, options, (data) => {
        if (!data) {
          outputError("Failed to reserve slot.");
          return;
        }
        outputSuccess(`Slot reserved: ${data.uid}`);
      });
    });

  slots
    .command("delete <uid>")
    .description("Delete a reserved slot")
    .option("--json", "Output as JSON")
    .action(async (uid: string, options: { json?: boolean }) => {
      await apiRequest<void>(`/v2/slots/reservations/${uid}`, {
        method: "DELETE",
        apiVersion: API_VERSION.V_2024_09_04,
      });

      if (options.json) {
        console.log(JSON.stringify({ status: "success", message: `Slot ${uid} deleted` }));
      } else {
        outputSuccess(`Reserved slot ${uid} deleted.`);
      }
    });
}
