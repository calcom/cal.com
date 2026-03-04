import chalk from "chalk";
import type { Command } from "commander";
import { apiRequest } from "../lib/api";
import { API_VERSION } from "../lib/constants";
import { handleOutput, outputError, outputSuccess, outputTable } from "../lib/output";

interface EventType {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  lengthInMinutes: number;
  locations: Array<{ type: string }>;
  bookingFields: unknown[];
  disableGuests: boolean;
  slotInterval: number | null;
  minimumBookingNotice: number;
  schedulingType: string | null;
  hidden: boolean;
}

function formatHidden(hidden: boolean): string {
  if (hidden) {
    return "Yes";
  }
  return "No";
}

function registerListAndGetCommands(eventTypes: Command): void {
  eventTypes
    .command("list")
    .description("List all event types")
    .option("--username <username>", "Filter by username")
    .option("--event-slug <slug>", "Filter by event slug")
    .option("--usernames <usernames>", "Filter by usernames (comma-separated)")
    .option("--json", "Output as JSON")
    .action(
      async (options: { username?: string; eventSlug?: string; usernames?: string; json?: boolean }) => {
        const query: Record<string, string | undefined> = {};
        if (options.username) query.username = options.username;
        if (options.eventSlug) query.eventSlug = options.eventSlug;
        if (options.usernames) query.usernames = options.usernames;

        const response = await apiRequest<EventType[]>("/v2/event-types", {
          query,
          apiVersion: API_VERSION.V_2024_06_14,
        });

        handleOutput(response.data, options, (data) => {
          if (!data || data.length === 0) {
            console.log("No event types found.");
            return;
          }
          outputTable(
            ["ID", "Title", "Slug", "Duration", "Hidden"],
            data.map((et) => [
              String(et.id),
              et.title,
              et.slug,
              `${et.lengthInMinutes} min`,
              formatHidden(et.hidden),
            ])
          );
        });
      }
    );

  eventTypes
    .command("get <eventTypeId>")
    .description("Get an event type by ID")
    .option("--json", "Output as JSON")
    .action(async (eventTypeId: string, options: { json?: boolean }) => {
      const response = await apiRequest<EventType>(`/v2/event-types/${eventTypeId}`, {
        apiVersion: API_VERSION.V_2024_06_14,
      });

      handleOutput(response.data, options, (data) => {
        if (!data) {
          outputError("Event type not found.");
          return;
        }
        console.log(chalk.bold(`\nEvent Type: ${data.title}`));
        console.log(`  ID:          ${data.id}`);
        console.log(`  Slug:        ${data.slug}`);
        console.log(`  Duration:    ${data.lengthInMinutes} min`);
        console.log(`  Description: ${data.description || "None"}`);
        console.log(`  Hidden:      ${formatHidden(data.hidden)}`);
        if (data.schedulingType) {
          console.log(`  Scheduling:  ${data.schedulingType}`);
        }
        console.log();
      });
    });
}

function registerMutationCommands(eventTypes: Command): void {
  eventTypes
    .command("create")
    .description("Create an event type")
    .requiredOption("--title <title>", "Event type title")
    .requiredOption("--slug <slug>", "Event type slug")
    .requiredOption("--length <minutes>", "Duration in minutes")
    .option("--description <desc>", "Description")
    .option("--hidden", "Create as hidden")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        title: string;
        slug: string;
        length: string;
        description?: string;
        hidden?: boolean;
        json?: boolean;
      }) => {
        const body: Record<string, unknown> = {
          title: options.title,
          slug: options.slug,
          lengthInMinutes: Number(options.length),
        };
        if (options.description) body.description = options.description;
        if (options.hidden) body.hidden = true;

        const response = await apiRequest<EventType>("/v2/event-types", {
          method: "POST",
          body,
          apiVersion: API_VERSION.V_2024_06_14,
        });

        handleOutput(response.data, options, (data) => {
          if (!data) {
            outputError("Failed to create event type.");
            return;
          }
          outputSuccess(`Event type created: ${data.title} (ID: ${data.id})`);
        });
      }
    );

  eventTypes
    .command("update <eventTypeId>")
    .description("Update an event type")
    .option("--title <title>", "New title")
    .option("--slug <slug>", "New slug")
    .option("--length <minutes>", "New duration in minutes")
    .option("--description <desc>", "New description")
    .option("--hidden <value>", "Set hidden (true/false)")
    .option("--json", "Output as JSON")
    .action(
      async (
        eventTypeId: string,
        options: {
          title?: string;
          slug?: string;
          length?: string;
          description?: string;
          hidden?: string;
          json?: boolean;
        }
      ) => {
        const body: Record<string, unknown> = {};
        if (options.title) body.title = options.title;
        if (options.slug) body.slug = options.slug;
        if (options.length) body.lengthInMinutes = Number(options.length);
        if (options.description) body.description = options.description;
        if (options.hidden !== undefined) body.hidden = options.hidden === "true";

        const response = await apiRequest<EventType>(`/v2/event-types/${eventTypeId}`, {
          method: "PATCH",
          body,
          apiVersion: API_VERSION.V_2024_06_14,
        });

        handleOutput(response.data, options, (data) => {
          if (!data) {
            outputError("Failed to update event type.");
            return;
          }
          outputSuccess(`Event type updated: ${data.title} (ID: ${data.id})`);
        });
      }
    );

  eventTypes
    .command("delete <eventTypeId>")
    .description("Delete an event type")
    .option("--json", "Output as JSON")
    .action(async (eventTypeId: string, options: { json?: boolean }) => {
      const response = await apiRequest<{ id: number; title: string }>(`/v2/event-types/${eventTypeId}`, {
        method: "DELETE",
        apiVersion: API_VERSION.V_2024_06_14,
      });

      handleOutput(response.data, options, (data) => {
        if (!data) {
          outputError("Failed to delete event type.");
          return;
        }
        outputSuccess(`Event type deleted: ${data.title} (ID: ${data.id})`);
      });
    });
}

export function registerEventTypesCommand(program: Command): void {
  const eventTypes = program.command("event-types").description("Manage event types");
  registerListAndGetCommands(eventTypes);
  registerMutationCommands(eventTypes);
}
