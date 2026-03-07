import {
  type OutputOptions,
  renderDetail,
  renderHeader,
  renderSuccess,
  renderTable,
} from "../../shared/output";
import type {
  CreateEventTypeResponse,
  DeleteEventTypeResponse,
  EventTypeList,
  EventTypeResponse,
  UpdateEventTypeResponse,
} from "./types";

export function renderEventTypeList(
  eventTypes: EventTypeList | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(eventTypes, null, 2));
    return;
  }

  if (!eventTypes?.length) {
    console.log("No event types found.");
    return;
  }

  renderTable(
    ["ID", "Title", "Slug", "Duration", "Hidden"],
    eventTypes.map((et) => [
      String(et.id),
      et.title,
      et.slug,
      `${et.lengthInMinutes} min`,
      et.hidden ? "Yes" : "No",
    ])
  );
}

export function renderEventType(data: EventTypeResponse | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Event type not found.");
    return;
  }

  renderHeader(`Event Type: ${data.title}`);
  renderDetail([
    ["ID:", data.id],
    ["Slug:", data.slug],
    ["Duration:", `${data.lengthInMinutes} min`],
    ["Description:", data.description || "None"],
    ["Hidden:", data.hidden],
    ["Schedule ID:", data.scheduleId],
  ]);
}

export function renderEventTypeCreated(
  data: CreateEventTypeResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to create event type.");
    return;
  }

  renderSuccess(`Event type created: ${data.title} (ID: ${data.id})`);
}

export function renderEventTypeUpdated(
  data: UpdateEventTypeResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to update event type.");
    return;
  }

  renderSuccess(`Event type updated: ${data.title} (ID: ${data.id})`);
}

export function renderEventTypeDeleted(
  data: DeleteEventTypeResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to delete event type.");
    return;
  }

  renderSuccess(`Event type deleted: ${data.title} (ID: ${data.id})`);
}
