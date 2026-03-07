import { type OutputOptions, renderDetail, renderHeader, renderSuccess, renderTable } from "../../shared/output";
import type { EventTypeWebhook, EventTypeWebhookResponse, EventTypeWebhooksResponse } from "./types";

export function renderEventTypeWebhook(
  data: EventTypeWebhookResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Event type webhook not found.");
    return;
  }

  renderHeader(`Event Type Webhook: ${data.id}`);
  renderDetail([
    ["Event Type ID:", String(data.eventTypeId)],
    ["Subscriber URL:", data.subscriberUrl],
    ["Active:", data.active ? "Yes" : "No"],
    ["Triggers:", data.triggers?.length ? data.triggers.join(", ") : undefined],
  ]);
}

export function renderEventTypeWebhookList(
  data: EventTypeWebhooksResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data?.length) {
    console.log("No event type webhooks found.");
    return;
  }

  renderTable(
    ["ID", "Event Type ID", "Subscriber URL", "Active", "Triggers"],
    data.map((webhook: EventTypeWebhook) => [
      String(webhook.id),
      String(webhook.eventTypeId),
      webhook.subscriberUrl,
      webhook.active ? "Yes" : "No",
      webhook.triggers?.join(", ") || "",
    ])
  );
}

export function renderEventTypeWebhookCreated(
  data: EventTypeWebhookResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to create event type webhook.");
    return;
  }

  renderSuccess(`Event type webhook created: ${data.id}`);
}

export function renderEventTypeWebhookUpdated(
  data: EventTypeWebhookResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to update event type webhook.");
    return;
  }

  renderSuccess(`Event type webhook updated: ${data.id}`);
}

export function renderEventTypeWebhookDeleted(webhookId: string, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify({ status: "success", message: `Event type webhook ${webhookId} deleted` }));
    return;
  }

  renderSuccess(`Event type webhook ${webhookId} deleted.`);
}

export function renderAllEventTypeWebhooksDeleted(eventTypeId: string, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(
      JSON.stringify({ status: "success", message: `All webhooks for event type ${eventTypeId} deleted` })
    );
    return;
  }

  renderSuccess(`All webhooks for event type ${eventTypeId} deleted.`);
}
