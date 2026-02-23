import chalk from "chalk";
import type { Command } from "commander";
import { apiRequest } from "../lib/api";
import { handleOutput, outputTable } from "../lib/output";

interface ConnectedCalendar {
  credentialId: number;
  integration: {
    type: string;
    title: string;
  };
  primary?: {
    externalId: string;
    name: string;
    readOnly: boolean;
    isSelected: boolean;
  };
  calendars: Array<{
    externalId: string;
    name: string;
    readOnly: boolean;
    isSelected: boolean;
  }>;
}

interface BusyTime {
  start: string;
  end: string;
  source?: string;
}

function formatSelectedLabel(isSelected: boolean): string {
  if (isSelected) {
    return chalk.green("[selected]");
  }
  return "";
}

function formatCalendarFlags(readOnly: boolean, isSelected: boolean): string {
  const parts: string[] = [];
  if (readOnly) {
    parts.push("read-only");
  }
  if (isSelected) {
    parts.push(chalk.green("selected"));
  }
  const flags = parts.join(", ");
  if (flags) {
    return `[${flags}]`;
  }
  return "";
}

export function registerCalendarsCommand(program: Command): void {
  const calendars = program.command("calendars").description("Manage calendars");

  calendars
    .command("list")
    .description("List connected calendars")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      const response = await apiRequest<ConnectedCalendar[]>("/v2/calendars");

      handleOutput(response.data, options, (data) => {
        if (!data || data.length === 0) {
          console.log("No connected calendars.");
          return;
        }
        for (const cal of data) {
          console.log(chalk.bold(`\n${cal.integration.title} (Credential: ${cal.credentialId})`));
          if (cal.primary) {
            const selectedLabel = formatSelectedLabel(cal.primary.isSelected);
            console.log(`  Primary: ${cal.primary.name} (${cal.primary.externalId}) ${selectedLabel}`);
          }
          if (cal.calendars?.length) {
            for (const sub of cal.calendars) {
              const flags = formatCalendarFlags(sub.readOnly, sub.isSelected);
              console.log(`  - ${sub.name} (${sub.externalId}) ${flags}`);
            }
          }
        }
        console.log();
      });
    });

  calendars
    .command("busy-times")
    .description("Get busy times from calendars")
    .requiredOption("--date-from <date>", "Start date (YYYY-MM-DD)")
    .requiredOption("--date-to <date>", "End date (YYYY-MM-DD)")
    .requiredOption("--timezone <tz>", "Timezone (e.g. Europe/Madrid)")
    .option("--credential-id <id>", "Credential ID to load calendars from")
    .option("--external-id <id>", "External calendar ID to load")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        dateFrom: string;
        dateTo: string;
        timezone: string;
        credentialId?: string;
        externalId?: string;
        json?: boolean;
      }) => {
        const query: Record<string, string | undefined> = {
          dateFrom: options.dateFrom,
          dateTo: options.dateTo,
          timeZone: options.timezone,
        };

        if (options.credentialId && options.externalId) {
          query["calendarsToLoad[0][credentialId]"] = options.credentialId;
          query["calendarsToLoad[0][externalId]"] = options.externalId;
        }

        const response = await apiRequest<BusyTime[]>("/v2/calendars/busy-times", { query });

        handleOutput(response.data, options, (data) => {
          if (!data || data.length === 0) {
            console.log("No busy times found.");
            return;
          }
          outputTable(
            ["Start", "End", "Source"],
            data.map((bt) => [
              new Date(bt.start).toLocaleString(),
              new Date(bt.end).toLocaleString(),
              bt.source || "",
            ])
          );
        });
      }
    );
}
