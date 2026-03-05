import type { Command } from "commander";
import {
  calendarsControllerGetBusyTimes as getBusyTimes,
  calendarsControllerGetCalendars as getCalendars,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import { renderBusyTimes, renderCalendarList } from "./output";

function registerCalendarQueryCommands(calendarsCmd: Command): void {
  calendarsCmd
    .command("list")
    .description("List connected calendars")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getCalendars({
          headers: authHeader(),
        });

        renderCalendarList(response?.data, options);
      });
    });

  calendarsCmd
    .command("busy-times")
    .description("Get busy times from calendars")
    .requiredOption("--date-from <date>", "Start date (YYYY-MM-DD)")
    .requiredOption("--date-to <date>", "End date (YYYY-MM-DD)")
    .requiredOption("--timezone <tz>", "Timezone (e.g. Europe/Madrid)")
    .requiredOption("--credential-id <id>", "Credential ID (from 'calendars list')")
    .requiredOption("--external-id <id>", "Calendar external ID (from 'calendars list')")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        dateFrom: string;
        dateTo: string;
        timezone: string;
        credentialId: string;
        externalId: string;
        json?: boolean;
      }) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const { data: response } = await getBusyTimes({
            query: {
              credentialId: Number(options.credentialId),
              externalId: options.externalId,
              dateFrom: options.dateFrom,
              dateTo: options.dateTo,
              timeZone: options.timezone,
            },
            headers: authHeader(),
          });

          renderBusyTimes(response?.data, options);
        });
      }
    );
}

export function registerCalendarsCommand(program: Command): void {
  const calendarsCmd = program.command("calendars").description("Manage calendars");
  registerCalendarQueryCommands(calendarsCmd);
}
