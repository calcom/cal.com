import type { Command } from "commander";
import {
  teamsEventTypesWebhooksControllerCreateTeamEventTypeWebhook as createWebhook,
  teamsEventTypesWebhooksControllerDeleteAllTeamEventTypeWebhooks as deleteAllWebhooks,
  teamsEventTypesWebhooksControllerDeleteTeamEventTypeWebhook as deleteWebhook,
  teamsEventTypesWebhooksControllerGetTeamEventTypeWebhook as getWebhook,
  teamsEventTypesWebhooksControllerGetTeamEventTypeWebhooks as getWebhooks,
  teamsEventTypesWebhooksControllerUpdateTeamEventTypeWebhook as updateWebhook,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import {
  renderAllTeamEventTypeWebhooksDeleted,
  renderTeamEventTypeWebhook,
  renderTeamEventTypeWebhookCreated,
  renderTeamEventTypeWebhookDeleted,
  renderTeamEventTypeWebhookList,
  renderTeamEventTypeWebhookUpdated,
} from "./output";

export function registerTeamEventTypeWebhooksCommand(program: Command): void {
  const webhooksCmd = program
    .command("team-event-type-webhooks")
    .description("Manage team event type webhooks");

  webhooksCmd
    .command("list <teamId> <eventTypeId>")
    .description("List webhooks for a team event type")
    .option("--take <n>", "Number of webhooks to return")
    .option("--skip <n>", "Number of webhooks to skip")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        eventTypeId: string,
        options: { take?: string; skip?: string; json?: boolean }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const { data: response } = await getWebhooks({
            path: { teamId: Number(teamId), eventTypeId: Number(eventTypeId) },
            query: {
              take: options.take ? Number(options.take) : undefined,
              skip: options.skip ? Number(options.skip) : undefined,
            },
            headers: authHeader(),
          });

          renderTeamEventTypeWebhookList(response?.data, options);
        });
      }
    );

  webhooksCmd
    .command("get <teamId> <eventTypeId> <webhookId>")
    .description("Get a team event type webhook by ID")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, eventTypeId: string, webhookId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getWebhook({
          path: {
            teamId: Number(teamId),
            eventTypeId: Number(eventTypeId),
            webhookId,
          },
          headers: authHeader(),
        });

        renderTeamEventTypeWebhook(response?.data, options);
      });
    });

  webhooksCmd
    .command("create <teamId> <eventTypeId>")
    .description("Create a team event type webhook")
    .requiredOption("--subscriber-url <url>", "Webhook subscriber URL")
    .requiredOption("--triggers <triggers>", "Triggers (comma-separated)")
    .option("--active", "Set webhook as active", true)
    .option("--secret <secret>", "Webhook secret")
    .option("--payload-template <template>", "Payload template")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        eventTypeId: string,
        options: {
          subscriberUrl: string;
          triggers: string;
          active?: boolean;
          secret?: string;
          payloadTemplate?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const triggers = options.triggers.split(",").map((t) => t.trim()) as Array<
            "BOOKING_CREATED" | "BOOKING_CANCELLED" | "BOOKING_RESCHEDULED" | "MEETING_ENDED"
          >;

          const { data: response } = await createWebhook({
            path: { teamId: Number(teamId), eventTypeId: Number(eventTypeId) },
            body: {
              subscriberUrl: options.subscriberUrl,
              triggers,
              active: options.active ?? true,
              secret: options.secret,
              payloadTemplate: options.payloadTemplate,
            },
            headers: authHeader(),
          });

          renderTeamEventTypeWebhookCreated(response?.data, options);
        });
      }
    );

  webhooksCmd
    .command("update <teamId> <eventTypeId> <webhookId>")
    .description("Update a team event type webhook")
    .option("--subscriber-url <url>", "New subscriber URL")
    .option("--triggers <triggers>", "New triggers (comma-separated)")
    .option("--active <value>", "Set active (true/false)")
    .option("--secret <secret>", "New secret")
    .option("--payload-template <template>", "New payload template")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        eventTypeId: string,
        webhookId: string,
        options: {
          subscriberUrl?: string;
          triggers?: string;
          active?: string;
          secret?: string;
          payloadTemplate?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const body: Record<string, unknown> = {};
          if (options.subscriberUrl) body.subscriberUrl = options.subscriberUrl;
          if (options.triggers) body.triggers = options.triggers.split(",").map((t) => t.trim());
          if (options.active !== undefined) body.active = options.active === "true";
          if (options.secret) body.secret = options.secret;
          if (options.payloadTemplate) body.payloadTemplate = options.payloadTemplate;

          const { data: response } = await updateWebhook({
            path: {
              teamId: Number(teamId),
              eventTypeId: Number(eventTypeId),
              webhookId,
            },
            body,
            headers: authHeader(),
          });

          renderTeamEventTypeWebhookUpdated(response?.data, options);
        });
      }
    );

  webhooksCmd
    .command("delete <teamId> <eventTypeId> <webhookId>")
    .description("Delete a team event type webhook")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, eventTypeId: string, webhookId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        await deleteWebhook({
          path: {
            teamId: Number(teamId),
            eventTypeId: Number(eventTypeId),
            webhookId,
          },
          headers: authHeader(),
        });

        renderTeamEventTypeWebhookDeleted(webhookId, options);
      });
    });

  webhooksCmd
    .command("delete-all <teamId> <eventTypeId>")
    .description("Delete all webhooks for a team event type")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, eventTypeId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        await deleteAllWebhooks({
          path: { teamId: Number(teamId), eventTypeId: Number(eventTypeId) },
          headers: authHeader(),
        });

        renderAllTeamEventTypeWebhooksDeleted(teamId, eventTypeId, options);
      });
    });
}
