import {
  formatDate,
  type OutputOptions,
  renderHeader,
  renderTable,
} from "../../shared/output";
import type { OrgOooEntry, OrgSchedule } from "./types";

function formatOooRow(entry: OrgOooEntry): string[] {
  return [
    String(entry.id),
    String(entry.userId),
    formatDate(entry.start),
    formatDate(entry.end),
    entry.reason ?? "unspecified",
    entry.notes ?? "",
  ];
}

export function renderOrgOooList(
  entries: OrgOooEntry[] | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(entries, null, 2));
    return;
  }

  if (!entries?.length) {
    console.log("No out-of-office entries found in your organization.");
    return;
  }

  renderHeader("Organization Out-of-Office Entries");
  renderTable(
    ["ID", "User ID", "Start", "End", "Reason", "Notes"],
    entries.map(formatOooRow)
  );
}

function formatScheduleRow(schedule: OrgSchedule): string[] {
  return [
    String(schedule.id),
    String(schedule.ownerId),
    schedule.name,
    schedule.timeZone,
    schedule.isDefault ? "Yes" : "No",
  ];
}

export function renderOrgSchedulesList(
  schedules: OrgSchedule[] | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(schedules, null, 2));
    return;
  }

  if (!schedules?.length) {
    console.log("No schedules found in your organization.");
    return;
  }

  renderHeader("Organization Schedules");
  renderTable(
    ["ID", "Owner ID", "Name", "Timezone", "Default"],
    schedules.map(formatScheduleRow)
  );
}
