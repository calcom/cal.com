import type { Command } from "commander";
import {
  eventTypeWebhooksControllerCreateEventTypeWebhook as createWebhook,
  eventTypeWebhooksControllerDeleteAllEventTypeWebhooks as deleteAllWebhooks,
  eventTypeWebhooksControllerDeleteEventTypeWebhook as deleteWebhook,
  eventTypeWebhooksControllerGetEventTypeWebhook as getWebhook,
  eventTypeWebhooksControllerGetEventTypeWebhooks as getWebhooks,
  eventTypeWebhooksControllerUpdateEventTypeWebhook as updateWebhook,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import {
  renderAllEventTypeWebhooksDeleted,
  renderEventTypeWebhook,
  renderEventTypeWebhookCreated,
  renderEventTypeWebhookDeleted,
  renderEventTypeWebhookList,
  renderEventTypeWebhookUpdated,
} from "./output";

export function registerEventTypeWebhooksCommand(program: Command): void {
  const webhooksCmd = program.command("event-type-webhooks").description("Manage event type webhooks");

  webhooksCmd
    .command("list <eventTypeId>")
    .description("List webhooks for an event type")
    .option("--take <n>", "Number of webhooks to return")
    .option("--skip <n>", "Number of webhooks to skip")
    .option("--json", "Output as JSON")
    .action(async (eventTypeId: string, options: { take?: string; skip?: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getWebhooks({
          path: { eventTypeId: Number(eventTypeId) },
          query: {
            take: options.take ? Number(options.take) : undefined,
            skip: options.skip ? Number(options.skip) : undefined,
          },
          headers: authHeader(),
        });

        renderEventTypeWebhookList(response?.data, options);
      });
    });

  webhooksCmd
    .command("get <eventTypeId> <webhookId>")
    .description("Get an event type webhook by ID")
    .option("--json", "Output as JSON")
    .action(async (eventTypeId: string, webhookId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getWebhook({
          path: { eventTypeId: Number(eventTypeId), webhookId },
          headers: authHeader(),
        });

        renderEventTypeWebhook(response?.data, options);
      });
    });

  webhooksCmd
    .command("create <eventTypeId>")
    .description("Create an event type webhook")
    .requiredOption("--subscriber-url <url>", "Webhook subscriber URL")
    .requiredOption("--triggers <triggers>", "Triggers (comma-separated)")
    .option("--active", "Set webhook as active", true)
    .option("--secret <secret>", "Webhook secret")
    .option("--payload-template <template>", "Payload template")
    .option("--json", "Output as JSON")
    .action(
      async (
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
            path: { eventTypeId: Number(eventTypeId) },
            body: {
              subscriberUrl: options.subscriberUrl,
              triggers,
              active: options.active ?? true,
              secret: options.secret,
              payloadTemplate: options.payloadTemplate,
            },
            headers: authHeader(),
          });

          renderEventTypeWebhookCreated(response?.data, options);
        });
      }
    );

  webhooksCmd
    .command("update <eventTypeId> <webhookId>")
    .description("Update an event type webhook")
    .option("--subscriber-url <url>", "New subscriber URL")
    .option("--triggers <triggers>", "New triggers (comma-separated)")
    .option("--active <value>", "Set active (true/false)")
    .option("--secret <secret>", "New secret")
    .option("--payload-template <template>", "New payload template")
    .option("--json", "Output as JSON")
    .action(
      async (
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
            path: { eventTypeId: Number(eventTypeId), webhookId },
            body,
            headers: authHeader(),
          });

          renderEventTypeWebhookUpdated(response?.data, options);
        });
      }
    );

  webhooksCmd
    .command("delete <eventTypeId> <webhookId>")
    .description("Delete an event type webhook")
    .option("--json", "Output as JSON")
    .action(async (eventTypeId: string, webhookId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        await deleteWebhook({
          path: { eventTypeId: Number(eventTypeId), webhookId },
          headers: authHeader(),
        });

        renderEventTypeWebhookDeleted(webhookId, options);
      });
    });

  webhooksCmd
    .command("delete-all <eventTypeId>")
    .description("Delete all webhooks for an event type")
    .option("--json", "Output as JSON")
    .action(async (eventTypeId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        await deleteAllWebhooks({
          path: { eventTypeId: Number(eventTypeId) },
          headers: authHeader(),
        });

        renderAllEventTypeWebhooksDeleted(eventTypeId, options);
      });
    });
}
