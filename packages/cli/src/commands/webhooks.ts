import chalk from "chalk";
import type { Command } from "commander";
import { apiRequest } from "../lib/api";
import { handleOutput, outputError, outputSuccess, outputTable } from "../lib/output";

interface Webhook {
  id: number;
  subscriberUrl: string;
  triggers?: string[];
  eventTriggers?: string[];
  active: boolean;
  payloadTemplate?: string | null;
}

function formatActiveStatus(active: boolean): string {
  if (active) {
    return chalk.green("Yes");
  }
  return chalk.red("No");
}

function formatTriggers(triggers: string[]): string {
  if (triggers.length === 0) return "";
  if (triggers.length <= 2) return triggers.join(", ");
  return `${triggers.slice(0, 2).join(", ")} +${triggers.length - 2} more`;
}

function registerWebhookQueryCommands(webhooks: Command): void {
  webhooks
    .command("list")
    .description("List all webhooks")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      const response = await apiRequest<Webhook[]>("/v2/webhooks");

      handleOutput(response.data, options, (data) => {
        if (!data || data.length === 0) {
          console.log("No webhooks found.");
          return;
        }
        outputTable(
          ["ID", "URL", "Triggers", "Active"],
          data.map((w) => [
            String(w.id),
            w.subscriberUrl || "",
            formatTriggers(w.triggers || w.eventTriggers || []),
            formatActiveStatus(w.active),
          ])
        );
      });
    });

  webhooks
    .command("get <webhookId>")
    .description("Get a webhook by ID")
    .option("--json", "Output as JSON")
    .action(async (webhookId: string, options: { json?: boolean }) => {
      const response = await apiRequest<Webhook>(`/v2/webhooks/${webhookId}`);

      handleOutput(response.data, options, (data) => {
        if (!data) {
          outputError("Webhook not found.");
          return;
        }
        console.log(chalk.bold(`\nWebhook #${data.id}`));
        console.log(`  URL:      ${data.subscriberUrl}`);
        const activeLabel = formatActiveStatus(data.active);
        console.log(`  Active:   ${activeLabel}`);
        console.log(`  Triggers: ${(data.triggers || data.eventTriggers || []).join(", ")}`);
        console.log();
      });
    });
}

function registerWebhookMutationCommands(webhooks: Command): void {
  webhooks
    .command("create")
    .description("Create a webhook")
    .requiredOption("--subscriber-url <url>", "Subscriber URL")
    .requiredOption("--triggers <triggers>", "Event triggers (comma-separated)")
    .option("--active <value>", "Active status (true/false)", "true")
    .option("--secret <secret>", "Webhook secret")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        subscriberUrl: string;
        triggers: string;
        active: string;
        secret?: string;
        json?: boolean;
      }) => {
        const body: Record<string, unknown> = {
          subscriberUrl: options.subscriberUrl,
          triggers: options.triggers.split(",").map((t) => t.trim()),
          active: options.active === "true",
        };
        if (options.secret) body.secret = options.secret;

        const response = await apiRequest<Webhook>("/v2/webhooks", {
          method: "POST",
          body,
        });

        handleOutput(response.data, options, (data) => {
          if (!data) {
            outputError("Failed to create webhook.");
            return;
          }
          outputSuccess(`Webhook created (ID: ${data.id})`);
        });
      }
    );

  webhooks
    .command("update <webhookId>")
    .description("Update a webhook")
    .option("--subscriber-url <url>", "New subscriber URL")
    .option("--triggers <triggers>", "New event triggers (comma-separated)")
    .option("--active <value>", "Active status (true/false)")
    .option("--secret <secret>", "New webhook secret")
    .option("--json", "Output as JSON")
    .action(
      async (
        webhookId: string,
        options: {
          subscriberUrl?: string;
          triggers?: string;
          active?: string;
          secret?: string;
          json?: boolean;
        }
      ) => {
        const body: Record<string, unknown> = {};
        if (options.subscriberUrl) body.subscriberUrl = options.subscriberUrl;
        if (options.triggers) body.triggers = options.triggers.split(",").map((t) => t.trim());
        if (options.active !== undefined) body.active = options.active === "true";
        if (options.secret) body.secret = options.secret;

        const response = await apiRequest<Webhook>(`/v2/webhooks/${webhookId}`, {
          method: "PATCH",
          body,
        });

        handleOutput(response.data, options, (data) => {
          if (!data) {
            outputError("Failed to update webhook.");
            return;
          }
          outputSuccess(`Webhook updated (ID: ${data.id})`);
        });
      }
    );

  webhooks
    .command("delete <webhookId>")
    .description("Delete a webhook")
    .option("--json", "Output as JSON")
    .action(async (webhookId: string, options: { json?: boolean }) => {
      await apiRequest<void>(`/v2/webhooks/${webhookId}`, { method: "DELETE" });

      if (options.json) {
        console.log(JSON.stringify({ status: "success", message: `Webhook ${webhookId} deleted` }));
      } else {
        outputSuccess(`Webhook ${webhookId} deleted.`);
      }
    });
}

export function registerWebhooksCommand(program: Command): void {
  const webhooks = program.command("webhooks").description("Manage webhooks");
  registerWebhookQueryCommands(webhooks);
  registerWebhookMutationCommands(webhooks);
}
