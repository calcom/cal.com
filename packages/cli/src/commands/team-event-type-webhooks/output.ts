import {
  type OutputOptions,
  renderDetail,
  renderHeader,
  renderSuccess,
  renderTable,
} from "../../shared/output";
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

  renderHeader(`Team Event Type Webhook: ${data.id}`);
  renderDetail([
    ["Event Type ID:", String(data.eventTypeId)],
    ["Subscriber URL:", data.subscriberUrl],
    ["Active:", data.active ? "Yes" : "No"],
    ["Triggers:", data.triggers?.length ? data.triggers.join(", ") : undefined],
  ]);
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
