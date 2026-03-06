import chalk from "chalk";
import { type OutputOptions, renderSuccess, renderTable } from "../../shared/output";
import type { Webhook, WebhookResponse, WebhooksResponse } from "./types";

function formatActiveStatus(active: boolean): string {
  return active ? chalk.green("Yes") : chalk.red("No");
}

function formatTriggers(triggers: string[], truncate = true): string {
  if (!triggers || triggers.length === 0) return "";
  if (!truncate || triggers.length <= 2) return triggers.join(", ");
  return `${triggers.slice(0, 2).join(", ")} +${triggers.length - 2} more`;
}

function renderWebhookDetail(webhook: Webhook): void {
  console.log(chalk.bold(`\nWebhook #${webhook.id}`));
  console.log(`  URL:      ${webhook.subscriberUrl}`);
  console.log(`  Active:   ${formatActiveStatus(webhook.active)}`);
  console.log(`  Triggers: ${formatTriggers(webhook.triggers || [], false)}`);
  console.log();
}

export function renderWebhook(data: WebhookResponse | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Webhook not found.");
    return;
  }

  renderWebhookDetail(data);
}

export function renderWebhookList(
  webhooks: WebhooksResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(webhooks, null, 2));
    return;
  }

  if (!webhooks?.length) {
    console.log("No webhooks found.");
    return;
  }

  renderTable(
    ["ID", "URL", "Triggers", "Active"],
    webhooks.map((w) => [
      String(w.id),
      w.subscriberUrl || "",
      formatTriggers(w.triggers || []),
      formatActiveStatus(w.active),
    ])
  );
}

export function renderWebhookCreated(data: WebhookResponse | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to create webhook.");
    return;
  }

  renderSuccess(`Webhook created (ID: ${data.id})`);
}

export function renderWebhookUpdated(data: WebhookResponse | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to update webhook.");
    return;
  }

  renderSuccess(`Webhook updated (ID: ${data.id})`);
}

export function renderWebhookDeleted(webhookId: string, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify({ status: "success", message: `Webhook ${webhookId} deleted` }));
    return;
  }

  renderSuccess(`Webhook ${webhookId} deleted.`);
}
