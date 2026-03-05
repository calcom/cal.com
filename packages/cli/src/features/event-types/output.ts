import chalk from "chalk";
import { renderSuccess, renderTable, type OutputOptions } from "../../shared/output";
import type {
  CreateEventTypeResponse,
  DeleteEventTypeResponse,
  EventType,
  EventTypeResponse,
  UpdateEventTypeResponse,
} from "./types";

function formatHidden(hidden: boolean): string {
  return hidden ? "Yes" : "No";
}

export function renderEventTypeList(eventTypes: EventType[] | undefined, { json }: OutputOptions = {}): void {
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
      formatHidden(et.hidden),
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

  const eventType = data as EventType;

  console.log(chalk.bold(`\nEvent Type: ${eventType.title}`));
  console.log(`  ID:          ${eventType.id}`);
  console.log(`  Slug:        ${eventType.slug}`);
  console.log(`  Duration:    ${eventType.lengthInMinutes} min`);
  console.log(`  Description: ${eventType.description || "None"}`);
  console.log(`  Hidden:      ${formatHidden(eventType.hidden)}`);
  if (eventType.scheduleId) {
    console.log(`  Schedule ID: ${eventType.scheduleId}`);
  }
  console.log();
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
