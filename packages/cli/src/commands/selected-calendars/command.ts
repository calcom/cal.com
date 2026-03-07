import type { Command } from "commander";
import {
  selectedCalendarsControllerAddSelectedCalendar as addSelectedCalendar,
  selectedCalendarsControllerDeleteSelectedCalendar as deleteSelectedCalendar,
} from "../../generated/sdk.gen";
import { client, initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import {
  renderSelectedCalendarAdded,
  renderSelectedCalendarList,
  renderSelectedCalendarRemoved,
} from "./output";
import type { SelectedCalendarListResponse } from "./types";

function registerSelectedCalendarQueryCommands(selectedCalsCmd: Command): void {
  selectedCalsCmd
    .command("list")
    .description("List selected calendars")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await client.get<SelectedCalendarListResponse>({
          url: "/v2/selected-calendars",
        });

        renderSelectedCalendarList(response?.data, options);
      });
    });
}

function registerSelectedCalendarMutationCommands(selectedCalsCmd: Command): void {
  selectedCalsCmd
    .command("add")
    .description("Add a selected calendar")
    .requiredOption("--integration <type>", "Calendar integration type")
    .requiredOption("--external-id <id>", "External calendar ID")
    .requiredOption("--credential-id <id>", "Credential ID")
    .option("--json", "Output as JSON")
    .action(
      async (options: { integration: string; externalId: string; credentialId: string; json?: boolean }) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const { data: response } = await addSelectedCalendar({
            body: {
              integration: options.integration,
              externalId: options.externalId,
              credentialId: Number(options.credentialId),
            },
            headers: authHeader(),
          });

          renderSelectedCalendarAdded(response?.data, options);
        });
      }
    );

  selectedCalsCmd
    .command("remove")
    .description("Remove a selected calendar")
    .requiredOption("--integration <type>", "Calendar integration type")
    .requiredOption("--external-id <id>", "External calendar ID")
    .requiredOption("--credential-id <id>", "Credential ID")
    .option("--json", "Output as JSON")
    .action(
      async (options: { integration: string; externalId: string; credentialId: string; json?: boolean }) => {
        await withErrorHandling(async () => {
          await initializeClient();

          await deleteSelectedCalendar({
            query: {
              integration: options.integration,
              externalId: options.externalId,
              credentialId: options.credentialId,
            },
            headers: authHeader(),
          });

          renderSelectedCalendarRemoved(options);
        });
      }
    );
}

export function registerSelectedCalendarsCommand(program: Command): void {
  const selectedCalsCmd = program.command("selected-calendars").description("Manage selected calendars");
  registerSelectedCalendarQueryCommands(selectedCalsCmd);
  registerSelectedCalendarMutationCommands(selectedCalsCmd);
}
