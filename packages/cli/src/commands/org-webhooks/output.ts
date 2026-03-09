import chalk from "chalk";
import {
  type OutputOptions,
  renderDetail,
  renderHeader,
  renderSuccess,
  renderTable,
} from "../../shared/output";
import type { OrgWebhook, OrgWebhookResponse, OrgWebhooksResponse } from "./types";

function formatActiveStatus(active: boolean): string {
  return active ? chalk.green("Yes") : chalk.red("No");
}

function formatTriggers(triggers: string[], truncate = true): string {
  if (!triggers || triggers.length === 0) return "";
  if (!truncate || triggers.length <= 2) return triggers.join(", ");
  return `${triggers.slice(0, 2).join(", ")} +${triggers.length - 2} more`;
}

function renderOrgWebhookDetail(webhook: OrgWebhook): void {
  renderHeader(`Org Webhook #${webhook.id}`);
  renderDetail([
    ["URL:", webhook.subscriberUrl],
    ["Active:", formatActiveStatus(webhook.active)],
    ["Team ID:", String(webhook.teamId)],
    ["Triggers:", formatTriggers(webhook.triggers || [], false)],
  ]);
}

export function renderOrgWebhook(data: OrgWebhookResponse | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Organization webhook not found.");
    return;
  }

  renderOrgWebhookDetail(data);
}

export function renderOrgWebhookList(
  webhooks: OrgWebhooksResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(webhooks, null, 2));
    return;
  }

  if (!webhooks?.length) {
    console.log("No organization webhooks found.");
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

export function renderOrgWebhookCreated(
  data: OrgWebhookResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to create organization webhook.");
    return;
  }

  renderSuccess(`Organization webhook created (ID: ${data.id})`);
}

export function renderOrgWebhookUpdated(
  data: OrgWebhookResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to update organization webhook.");
    return;
  }

  renderSuccess(`Organization webhook updated (ID: ${data.id})`);
}

export function renderOrgWebhookDeleted(webhookId: string, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify({ status: "success", message: `Organization webhook ${webhookId} deleted` }));
    return;
  }

  renderSuccess(`Organization webhook ${webhookId} deleted.`);
}
