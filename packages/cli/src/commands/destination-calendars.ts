import chalk from "chalk";
import type { Command } from "commander";
import { apiRequest } from "../lib/api";
import { handleOutput, outputError, outputSuccess } from "../lib/output";

interface DestinationCalendar {
  id: number;
  integration: string;
  externalId: string;
  primaryEmail: string | null;
  userId: number | null;
  eventTypeId: number | null;
  credentialId: number | null;
}

export function registerDestinationCalendarsCommand(program: Command): void {
  const destCals = program.command("destination-calendars").description("Manage destination calendars");

  destCals
    .command("list")
    .description("List destination calendars")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      const response = await apiRequest<DestinationCalendar[]>("/v2/destination-calendars");

      handleOutput(response.data, options, (data) => {
        if (!data || (Array.isArray(data) && data.length === 0)) {
          console.log("No destination calendars configured.");
          return;
        }
        let items: DestinationCalendar[];
        if (Array.isArray(data)) {
          items = data;
        } else {
          items = [data];
        }
        for (const cal of items) {
          console.log(chalk.bold(`\nDestination Calendar #${cal.id}`));
          console.log(`  Integration:  ${cal.integration}`);
          console.log(`  External ID:  ${cal.externalId}`);
          if (cal.primaryEmail) console.log(`  Email:        ${cal.primaryEmail}`);
          if (cal.credentialId) console.log(`  Credential:   ${cal.credentialId}`);
        }
        console.log();
      });
    });

  destCals
    .command("update")
    .description("Update destination calendar")
    .requiredOption("--integration <type>", "Calendar integration type")
    .requiredOption("--external-id <id>", "External calendar ID")
    .option("--event-type-id <id>", "Event type ID")
    .option("--json", "Output as JSON")
    .action(
      async (options: { integration: string; externalId: string; eventTypeId?: string; json?: boolean }) => {
        const body: Record<string, unknown> = {
          integration: options.integration,
          externalId: options.externalId,
        };
        if (options.eventTypeId) body.eventTypeId = Number(options.eventTypeId);

        const response = await apiRequest<DestinationCalendar>("/v2/destination-calendars", {
          method: "PUT",
          body,
        });

        handleOutput(response.data, options, (data) => {
          if (!data) {
            outputError("Failed to update destination calendar.");
            return;
          }
          outputSuccess(`Destination calendar updated (ID: ${data.id})`);
        });
      }
    );
}
