import chalk from "chalk";
import { type OutputOptions, renderSuccess, renderTable } from "../../shared/output";
import type {
  TeamEventType,
  TeamEventTypeCreateResponse,
  TeamEventTypeGetResponse,
  TeamEventTypeList,
  TeamEventTypeUpdateResponse,
} from "./types";

function formatSchedulingType(type: string | undefined): string {
  if (!type) return "";
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase().replace("_", " ");
}

function formatHosts(hosts: TeamEventType["hosts"] | undefined): string {
  if (!hosts || hosts.length === 0) return "None";
  if (hosts.length <= 2) {
    return hosts.join(", ");
  }
  return `${hosts.slice(0, 2).join(", ")} +${hosts.length - 2} more`;
}

export function renderTeamEventType(
  data: TeamEventTypeGetResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Team event type not found.");
    return;
  }

  console.log(chalk.bold(`\nTeam Event Type: ${data.title}`));
  console.log(`  ID:              ${data.id}`);
  console.log(`  Slug:            ${data.slug}`);
  console.log(`  Length:          ${data.lengthInMinutes} minutes`);
  console.log(`  Scheduling Type: ${formatSchedulingType(data.schedulingType)}`);
  if (data.description) console.log(`  Description:     ${data.description}`);
  console.log(`  Hidden:          ${data.hidden ? "Yes" : "No"}`);
  console.log(`  Hosts:           ${formatHosts(data.hosts)}`);
  console.log();
}

export function renderTeamEventTypeList(
  data: TeamEventTypeList | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data?.length) {
    console.log("No team event types found.");
    return;
  }

  renderTable(
    ["ID", "Title", "Slug", "Length", "Scheduling Type", "Hosts"],
    data.map((et) => [
      String(et.id),
      et.title,
      et.slug,
      `${et.lengthInMinutes}m`,
      formatSchedulingType(et.schedulingType),
      formatHosts(et.hosts),
    ])
  );
}

function getEventTypeFromResponse(
  data: TeamEventTypeCreateResponse | TeamEventTypeUpdateResponse | undefined
): TeamEventType | undefined {
  if (!data) return undefined;
  if (Array.isArray(data)) return data[0];
  return data as TeamEventType;
}

export function renderTeamEventTypeCreated(
  data: TeamEventTypeCreateResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const eventType = getEventTypeFromResponse(data);
  if (!eventType) {
    console.log("Failed to create team event type.");
    return;
  }

  renderSuccess(`Team event type created: ${eventType.title} (ID: ${eventType.id})`);
}

export function renderTeamEventTypeUpdated(
  data: TeamEventTypeUpdateResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const eventType = getEventTypeFromResponse(data);
  if (!eventType) {
    console.log("Failed to update team event type.");
    return;
  }

  renderSuccess(`Team event type updated: ${eventType.title} (ID: ${eventType.id})`);
}

export function renderTeamEventTypeDeleted(eventTypeId: string, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify({ status: "success", message: `Team event type ${eventTypeId} deleted` }));
    return;
  }

  renderSuccess(`Team event type ${eventTypeId} deleted.`);
}
