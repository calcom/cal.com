import chalk from "chalk";
import { type OutputOptions, renderSuccess, renderTable } from "../../shared/output";
import type {
  TeamEventTypeWebhook,
  TeamEventTypeWebhookResponse,
  TeamEventTypeWebhooksResponse,
} from "./types";

export function renderTeamEventTypeWebhook(
  data: TeamEventTypeWebhookResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Team event type webhook not found.");
    return;
  }

  console.log(chalk.bold(`\nTeam Event Type Webhook: ${data.id}`));
  console.log(`  Event Type ID:  ${data.eventTypeId}`);
  console.log(`  Subscriber URL: ${data.subscriberUrl}`);
  console.log(`  Active:         ${data.active ? "Yes" : "No"}`);
  if (data.triggers?.length) console.log(`  Triggers:       ${data.triggers.join(", ")}`);
  console.log();
}

export function renderTeamEventTypeWebhookList(
  data: TeamEventTypeWebhooksResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data?.length) {
    console.log("No team event type webhooks found.");
    return;
  }

  renderTable(
    ["ID", "Event Type ID", "Subscriber URL", "Active", "Triggers"],
    data.map((webhook: TeamEventTypeWebhook) => [
      String(webhook.id),
      String(webhook.eventTypeId),
      webhook.subscriberUrl,
      webhook.active ? "Yes" : "No",
      webhook.triggers?.join(", ") || "",
    ])
  );
}

export function renderTeamEventTypeWebhookCreated(
  data: TeamEventTypeWebhookResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to create team event type webhook.");
    return;
  }

  renderSuccess(`Team event type webhook created: ${data.id}`);
}

export function renderTeamEventTypeWebhookUpdated(
  data: TeamEventTypeWebhookResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to update team event type webhook.");
    return;
  }

  renderSuccess(`Team event type webhook updated: ${data.id}`);
}

export function renderTeamEventTypeWebhookDeleted(webhookId: string, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(
      JSON.stringify({ status: "success", message: `Team event type webhook ${webhookId} deleted` })
    );
    return;
  }

  renderSuccess(`Team event type webhook ${webhookId} deleted.`);
}

export function renderAllTeamEventTypeWebhooksDeleted(
  teamId: string,
  eventTypeId: string,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(
      JSON.stringify({
        status: "success",
        message: `All webhooks for team ${teamId} event type ${eventTypeId} deleted`,
      })
    );
    return;
  }

  renderSuccess(`All webhooks for team ${teamId} event type ${eventTypeId} deleted.`);
}
