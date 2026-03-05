import type { Command } from "commander";
import {
  webhooksControllerCreateWebhook as createWebhook,
  webhooksControllerDeleteWebhook as deleteWebhook,
  webhooksControllerGetWebhook as getWebhook,
  webhooksControllerGetWebhooks as getWebhooks,
  webhooksControllerUpdateWebhook as updateWebhook,
} from "../../generated/sdk.gen";
import type { CreateWebhookInputDto, UpdateWebhookInputDto } from "../../generated/types.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import {
  renderWebhook,
  renderWebhookCreated,
  renderWebhookDeleted,
  renderWebhookList,
  renderWebhookUpdated,
} from "./output";

function registerWebhookQueryCommands(webhooksCmd: Command): void {
  webhooksCmd
    .command("list")
    .description("List all webhooks")
    .option("--take <n>", "Number of webhooks to return")
    .option("--skip <n>", "Number of webhooks to skip")
    .option("--json", "Output as JSON")
    .action(async (options: { take?: string; skip?: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getWebhooks({
          query: {
            take: options.take ? Number(options.take) : undefined,
            skip: options.skip ? Number(options.skip) : undefined,
          },
          headers: authHeader(),
        });

        renderWebhookList(response?.data, options);
      });
    });

  webhooksCmd
    .command("get <webhookId>")
    .description("Get a webhook by ID")
    .option("--json", "Output as JSON")
    .action(async (webhookId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getWebhook({
          path: { webhookId },
          headers: authHeader(),
        });

        renderWebhook(response?.data, options);
      });
    });
}

function registerWebhookMutationCommands(webhooksCmd: Command): void {
  webhooksCmd
    .command("create")
    .description("Create a webhook")
    .requiredOption("--subscriber-url <url>", "Subscriber URL")
    .requiredOption("--triggers <triggers>", "Event triggers (comma-separated)")
    .option("--active <value>", "Active status (true/false)", "true")
    .option("--secret <secret>", "Webhook secret")
    .option("--payload-template <template>", "Payload template")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        subscriberUrl: string;
        triggers: string;
        active: string;
        secret?: string;
        payloadTemplate?: string;
        json?: boolean;
      }) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const triggers = options.triggers.split(",").map((t) => t.trim());

          const { data: response } = await createWebhook({
            body: {
              subscriberUrl: options.subscriberUrl,
              // API expects array but SDK types say single string - cast to any
              triggers: triggers as unknown as CreateWebhookInputDto["triggers"],
              active: options.active === "true",
              secret: options.secret,
              payloadTemplate: options.payloadTemplate,
            },
            headers: authHeader(),
          });

          renderWebhookCreated(response?.data, options);
        });
      }
    );

  webhooksCmd
    .command("update <webhookId>")
    .description("Update a webhook")
    .option("--subscriber-url <url>", "New subscriber URL")
    .option("--triggers <triggers>", "New event triggers (comma-separated)")
    .option("--active <value>", "Active status (true/false)")
    .option("--secret <secret>", "New webhook secret")
    .option("--payload-template <template>", "New payload template")
    .option("--json", "Output as JSON")
    .action(
      async (
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

          const body: UpdateWebhookInputDto = {};
          if (options.subscriberUrl) body.subscriberUrl = options.subscriberUrl;
          if (options.triggers) {
            const triggers = options.triggers.split(",").map((t) => t.trim());
            // API expects array but SDK types say single string - cast to any
            body.triggers = triggers as unknown as UpdateWebhookInputDto["triggers"];
          }
          if (options.active !== undefined) body.active = options.active === "true";
          if (options.secret) body.secret = options.secret;
          if (options.payloadTemplate) body.payloadTemplate = options.payloadTemplate;

          const { data: response } = await updateWebhook({
            path: { webhookId },
            body,
            headers: authHeader(),
          });

          renderWebhookUpdated(response?.data, options);
        });
      }
    );

  webhooksCmd
    .command("delete <webhookId>")
    .description("Delete a webhook")
    .option("--json", "Output as JSON")
    .action(async (webhookId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        await deleteWebhook({
          path: { webhookId },
          headers: authHeader(),
        });

        renderWebhookDeleted(webhookId, options);
      });
    });
}

export function registerWebhooksCommand(program: Command): void {
  const webhooksCmd = program.command("webhooks").description("Manage webhooks");
  registerWebhookQueryCommands(webhooksCmd);
  registerWebhookMutationCommands(webhooksCmd);
}
