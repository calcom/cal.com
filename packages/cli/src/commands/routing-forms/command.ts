import type { Command } from "commander";
import { routingFormsControllerCalculateSlotsBasedOnRoutingFormResponse as calculateSlots } from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import { renderRoutingFormSlots } from "./output";

export function registerRoutingFormsCommand(program: Command): void {
  const routingFormsCmd = program.command("routing-forms").description("Manage routing forms");

  routingFormsCmd
    .command("slots <formId>")
    .description("Calculate available slots based on a routing form response")
    .requiredOption("--start <date>", "Start date for slot calculation (ISO 8601)")
    .requiredOption("--end <date>", "End date for slot calculation (ISO 8601)")
    .option("--duration <minutes>", "Slot duration in minutes")
    .option("--timezone <tz>", "Timezone for slots")
    .option("--reschedule-uid <uid>", "Booking UID to reschedule")
    .option("--json", "Output as JSON")
    .action(
      async (
        formId: string,
        options: {
          start: string;
          end: string;
          duration?: string;
          timezone?: string;
          rescheduleUid?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const { data: response } = await calculateSlots({
            path: { routingFormId: formId },
            query: {
              start: options.start,
              end: options.end,
              duration: options.duration ? Number(options.duration) : undefined,
              timeZone: options.timezone,
              bookingUidToReschedule: options.rescheduleUid,
            },
            headers: authHeader(),
          });

          renderRoutingFormSlots(response?.data, options);
        });
      }
    );
}
