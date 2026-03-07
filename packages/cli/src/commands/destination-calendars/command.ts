import type { Command } from "commander";
import {
  calendarsControllerGetCalendars as getCalendars,
  destinationCalendarsControllerUpdateDestinationCalendars as updateDestinationCalendar,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import { renderDestinationCalendar, renderDestinationCalendarUpdated } from "./output";

function registerDestinationCalendarQueryCommands(destCalCmd: Command): void {
  destCalCmd
    .command("list")
    .description("List destination calendars")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const { data: response } = await getCalendars({ headers: authHeader() });
        renderDestinationCalendar(response?.data?.destinationCalendar, options);
      });
    });
}

function registerDestinationCalendarMutationCommands(destCalCmd: Command): void {
  destCalCmd
    .command("update")
    .description("Update destination calendar")
    .requiredOption(
      "--integration <type>",
      "Calendar integration type (apple_calendar, google_calendar, office365_calendar)"
    )
    .requiredOption("--external-id <id>", "External calendar ID")
    .option("--json", "Output as JSON")
    .action(async (options: { integration: string; externalId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const { data: response } = await updateDestinationCalendar({
          headers: authHeader(),
          body: {
            integration: options.integration as "apple_calendar" | "google_calendar" | "office365_calendar",
            externalId: options.externalId,
          },
        });
        renderDestinationCalendarUpdated(response?.data, options);
      });
    });
}

export function registerDestinationCalendarsCommand(program: Command): void {
  const destCalCmd = program.command("destination-calendars").description("Manage destination calendars");
  registerDestinationCalendarQueryCommands(destCalCmd);
  registerDestinationCalendarMutationCommands(destCalCmd);
}
