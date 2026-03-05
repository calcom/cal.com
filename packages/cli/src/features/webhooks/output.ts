import chalk from "chalk";
import { renderSuccess, renderTable, type OutputOptions } from "../../shared/output";
import type { Webhook, WebhookResponse, WebhooksResponse } from "./types";

function formatActiveStatus(active: boolean): string {
  return active ? chalk.green("Yes") : chalk.red("No");
}

function triggerToString(trigger: unknown): string {
  if (typeof trigger === "string") return trigger;
  if (typeof trigger === "object" && trigger !== null) {
    return Object.values(trigger).join("");
  }
  return String(trigger);
}

function formatTriggers(triggers: Array<{ [key: string]: unknown }>, truncate = true): string {
  if (!triggers || triggers.length === 0) return "";
  const triggerStrings = triggers.map(triggerToString);
  if (!truncate || triggerStrings.length <= 2) return triggerStrings.join(", ");
  return `${triggerStrings.slice(0, 2).join(", ")} +${triggerStrings.length - 2} more`;
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
