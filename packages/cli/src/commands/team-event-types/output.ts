import {
  type OutputOptions,
  renderDetail,
  renderHeader,
  renderSuccess,
  renderTable,
} from "../../shared/output";
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
  // API returns hosts as objects with name property, not strings
  const hostNames = hosts.map((host) => {
    if (typeof host === "string") return host;
    if (typeof host === "object" && host !== null && "name" in host) {
      return (host as { name?: string }).name || "Unknown";
    }
    return "Unknown";
  });
  if (hostNames.length <= 2) {
    return hostNames.join(", ");
  }
  return `${hostNames.slice(0, 2).join(", ")} +${hostNames.length - 2} more`;
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

  renderHeader(`Team Event Type: ${data.title}`);
  renderDetail([
    ["ID:", String(data.id)],
    ["Slug:", data.slug],
    ["Length:", `${data.lengthInMinutes} minutes`],
    ["Scheduling Type:", formatSchedulingType(data.schedulingType)],
    ["Description:", data.description],
    ["Hidden:", data.hidden ? "Yes" : "No"],
    ["Hosts:", formatHosts(data.hosts)],
  ]);
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
