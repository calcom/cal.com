import type { Command } from "commander";
import {
  organizationsWebhooksControllerCreateOrganizationWebhook as createOrgWebhook,
  organizationsWebhooksControllerDeleteWebhook as deleteOrgWebhook,
  organizationsWebhooksControllerGetOrganizationWebhook as getOrgWebhook,
  organizationsWebhooksControllerGetAllOrganizationWebhooks as getOrgWebhooks,
  organizationsWebhooksControllerUpdateOrgWebhook as updateOrgWebhook,
} from "../../generated/sdk.gen";
import type { CreateWebhookInputDto, UpdateWebhookInputDto } from "../../generated/types.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import {
  renderOrgWebhook,
  renderOrgWebhookCreated,
  renderOrgWebhookDeleted,
  renderOrgWebhookList,
  renderOrgWebhookUpdated,
} from "./output";

function registerOrgWebhookQueryCommands(orgWebhooksCmd: Command): void {
  orgWebhooksCmd
    .command("list")
    .description("List all organization webhooks")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--take <n>", "Number of webhooks to return")
    .option("--skip <n>", "Number of webhooks to skip")
    .option("--json", "Output as JSON")
    .action(async (options: { orgId: string; take?: string; skip?: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = Number(options.orgId);

        const { data: response } = await getOrgWebhooks({
          path: { orgId },
          query: {
            take: options.take ? Number(options.take) : undefined,
            skip: options.skip ? Number(options.skip) : undefined,
          },
          headers: authHeader(),
        });

        renderOrgWebhookList(response?.data, options);
      });
    });

  orgWebhooksCmd
    .command("get <webhookId>")
    .description("Get an organization webhook by ID")
    .option("--json", "Output as JSON")
    .action(async (webhookId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getOrgWebhook({
          path: { webhookId },
          headers: authHeader(),
        });

        renderOrgWebhook(response?.data, options);
      });
    });
}

function registerOrgWebhookMutationCommands(orgWebhooksCmd: Command): void {
  orgWebhooksCmd
    .command("create")
    .description("Create an organization webhook")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .requiredOption("--subscriber-url <url>", "Subscriber URL")
    .requiredOption("--triggers <triggers>", "Event triggers (comma-separated)")
    .option("--active <value>", "Active status (true/false)", "true")
    .option("--secret <secret>", "Webhook secret")
    .option("--payload-template <template>", "Payload template")
    .option("--json", "Output as JSON")
    .action(
      async (options: { orgId: string;
        subscriberUrl: string;
        triggers: string;
        active: string;
        secret?: string;
        payloadTemplate?: string;
        json?: boolean;
      }) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = Number(options.orgId);

          const triggers = options.triggers
            .split(",")
            .map((t) => t.trim()) as CreateWebhookInputDto["triggers"];

          const body: CreateWebhookInputDto = {
            subscriberUrl: options.subscriberUrl,
            triggers,
            active: options.active === "true",
          };

          if (options.secret) body.secret = options.secret;
          if (options.payloadTemplate) body.payloadTemplate = options.payloadTemplate;

          const { data: response } = await createOrgWebhook({
            path: { orgId },
            body,
            headers: authHeader(),
          });

          renderOrgWebhookCreated(response?.data, options);
        });
      }
    );

  orgWebhooksCmd
    .command("update <webhookId>")
    .description("Update an organization webhook")
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
            body.triggers = options.triggers
              .split(",")
              .map((t) => t.trim()) as UpdateWebhookInputDto["triggers"];
          }
          if (options.active !== undefined) body.active = options.active === "true";
          if (options.secret) body.secret = options.secret;
          if (options.payloadTemplate) body.payloadTemplate = options.payloadTemplate;

          const { data: response } = await updateOrgWebhook({
            path: { webhookId },
            body,
            headers: authHeader(),
          });

          renderOrgWebhookUpdated(response?.data, options);
        });
      }
    );

  orgWebhooksCmd
    .command("delete <webhookId>")
    .description("Delete an organization webhook")
    .option("--json", "Output as JSON")
    .action(async (webhookId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        await deleteOrgWebhook({
          path: { webhookId },
          headers: authHeader(),
        });

        renderOrgWebhookDeleted(webhookId, options);
      });
    });
}

export function registerOrgWebhooksCommand(program: Command): void {
  const orgWebhooksCmd = program.command("org-webhooks").description("Manage organization webhooks");
  registerOrgWebhookQueryCommands(orgWebhooksCmd);
  registerOrgWebhookMutationCommands(orgWebhooksCmd);
}
