import type { Command } from "commander";
import { apiRequest } from "../lib/api";
import { handleOutput, outputSuccess, outputTable } from "../lib/output";

interface SelectedCalendar {
  integration: string;
  externalId: string;
  credentialId: number;
}

export function registerSelectedCalendarsCommand(program: Command): void {
  const selectedCals = program.command("selected-calendars").description("Manage selected calendars");

  selectedCals
    .command("list")
    .description("List selected calendars")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      const response = await apiRequest<SelectedCalendar[]>("/v2/selected-calendars");

      handleOutput(response.data, options, (data) => {
        if (!data || data.length === 0) {
          console.log("No selected calendars.");
          return;
        }
        outputTable(
          ["Integration", "External ID", "Credential ID"],
          data.map((c) => [c.integration, c.externalId, String(c.credentialId)])
        );
      });
    });

  selectedCals
    .command("add")
    .description("Add a selected calendar")
    .requiredOption("--integration <type>", "Calendar integration type")
    .requiredOption("--external-id <id>", "External calendar ID")
    .requiredOption("--credential-id <id>", "Credential ID")
    .option("--json", "Output as JSON")
    .action(
      async (options: { integration: string; externalId: string; credentialId: string; json?: boolean }) => {
        const body: Record<string, unknown> = {
          integration: options.integration,
          externalId: options.externalId,
          credentialId: Number(options.credentialId),
        };

        const response = await apiRequest<SelectedCalendar>("/v2/selected-calendars", {
          method: "POST",
          body,
        });

        handleOutput(response.data, options, () => {
          outputSuccess("Selected calendar added.");
        });
      }
    );

  selectedCals
    .command("remove")
    .description("Remove a selected calendar")
    .requiredOption("--integration <type>", "Calendar integration type")
    .requiredOption("--external-id <id>", "External calendar ID")
    .requiredOption("--credential-id <id>", "Credential ID")
    .option("--json", "Output as JSON")
    .action(
      async (options: { integration: string; externalId: string; credentialId: string; json?: boolean }) => {
        const query: Record<string, string> = {
          integration: options.integration,
          externalId: options.externalId,
          credentialId: options.credentialId,
        };

        await apiRequest<void>("/v2/selected-calendars", {
          method: "DELETE",
          query,
        });

        if (options.json) {
          console.log(JSON.stringify({ status: "success", message: "Selected calendar removed" }));
        } else {
          outputSuccess("Selected calendar removed.");
        }
      }
    );
}
