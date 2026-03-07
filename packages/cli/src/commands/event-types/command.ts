import type { Command } from "commander";
import {
  eventTypesController20240614CreateEventType as createEventType,
  eventTypesController20240614DeleteEventType as deleteEventType,
  eventTypesController20240614GetEventTypeById as getEventTypeById,
  eventTypesController20240614GetEventTypes as getEventTypes,
  eventTypesController20240614UpdateEventType as updateEventType,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { ApiVersion } from "../../shared/constants";
import { withErrorHandling } from "../../shared/errors";
import { apiVersionHeader } from "../../shared/headers";
import {
  renderEventType,
  renderEventTypeCreated,
  renderEventTypeDeleted,
  renderEventTypeList,
  renderEventTypeUpdated,
} from "./output";

function registerEventTypeQueryCommands(eventTypesCmd: Command): void {
  eventTypesCmd
    .command("list")
    .description("List all event types")
    .option("--username <username>", "Filter by username")
    .option("--event-slug <slug>", "Filter by event slug")
    .option("--usernames <usernames>", "Filter by usernames (comma-separated)")
    .option("--json", "Output as JSON")
    .action(
      async (options: { username?: string; eventSlug?: string; usernames?: string; json?: boolean }) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const { data: response } = await getEventTypes({
            query: {
              username: options.username,
              eventSlug: options.eventSlug,
              usernames: options.usernames,
            },
            headers: apiVersionHeader(ApiVersion.V2024_06_14),
          });

          renderEventTypeList(response?.data, options);
        });
      }
    );

  eventTypesCmd
    .command("get <eventTypeId>")
    .description("Get an event type by ID")
    .option("--json", "Output as JSON")
    .action(async (eventTypeId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getEventTypeById({
          path: { eventTypeId },
          headers: apiVersionHeader(ApiVersion.V2024_06_14),
        });

        renderEventType(response?.data, options);
      });
    });
}

function registerEventTypeMutationCommands(eventTypesCmd: Command): void {
  eventTypesCmd
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
        await withErrorHandling(async () => {
          await initializeClient();

          const { data: response } = await createEventType({
            body: {
              title: options.title,
              slug: options.slug,
              lengthInMinutes: Number(options.length),
              description: options.description,
              hidden: options.hidden,
            },
            headers: apiVersionHeader(ApiVersion.V2024_06_14),
          });

          renderEventTypeCreated(response?.data, options);
        });
      }
    );

  eventTypesCmd
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
        await withErrorHandling(async () => {
          await initializeClient();

          const body: Record<string, unknown> = {};
          if (options.title) body.title = options.title;
          if (options.slug) body.slug = options.slug;
          if (options.length) body.lengthInMinutes = Number(options.length);
          if (options.description) body.description = options.description;
          if (options.hidden !== undefined) body.hidden = options.hidden === "true";

          const { data: response } = await updateEventType({
            path: { eventTypeId: Number(eventTypeId) },
            body,
            headers: apiVersionHeader(ApiVersion.V2024_06_14),
          });

          renderEventTypeUpdated(response?.data, options);
        });
      }
    );

  eventTypesCmd
    .command("delete <eventTypeId>")
    .description("Delete an event type")
    .option("--json", "Output as JSON")
    .action(async (eventTypeId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await deleteEventType({
          path: { eventTypeId: Number(eventTypeId) },
          headers: apiVersionHeader(ApiVersion.V2024_06_14),
        });

        renderEventTypeDeleted(response?.data, options);
      });
    });
}

export function registerEventTypesCommand(program: Command): void {
  const eventTypesCmd = program.command("event-types").description("Manage event types");
  registerEventTypeQueryCommands(eventTypesCmd);
  registerEventTypeMutationCommands(eventTypesCmd);
}
