import chalk from "chalk";
import { type OutputOptions, renderDetail, renderHeader, renderSuccess, renderTable } from "../../shared/output";
import type { OrgUserSchedule, OrgUserScheduleDetail } from "./types";

function formatDefaultLabel(isDefault: boolean): string {
  return isDefault ? "Yes" : "No";
}

function renderScheduleDetail(schedule: OrgUserSchedule | OrgUserScheduleDetail | null): void {
  if (!schedule) return;
  renderHeader(`Schedule: ${schedule.name}`);
  renderDetail([
    ["ID:", String(schedule.id)],
    ["Timezone:", schedule.timeZone],
    ["Default:", formatDefaultLabel(schedule.isDefault)],
  ]);
  if (schedule.availability?.length) {
    console.log("  Availability:");
    for (const a of schedule.availability) {
      console.log(`    ${a.days}: ${a.startTime} - ${a.endTime}`);
    }
    console.log();
  }
}

export function renderOrgUserSchedule(
  schedule: OrgUserScheduleDetail | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(schedule, null, 2));
    return;
  }

  if (!schedule) {
    console.log("Schedule not found.");
    return;
  }

  renderScheduleDetail(schedule);
}

export function renderOrgUserScheduleList(
  schedules: OrgUserSchedule[] | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(schedules, null, 2));
    return;
  }

  if (!schedules?.length) {
    console.log("No schedules found for this user.");
    return;
  }

  renderTable(
    ["ID", "Name", "Timezone", "Default"],
    schedules.map((s) => [String(s.id), s.name, s.timeZone, formatDefaultLabel(s.isDefault)])
  );
}

export function renderOrgUserScheduleCreated(
  schedule: OrgUserScheduleDetail | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(schedule, null, 2));
    return;
  }

  if (!schedule) {
    console.log("Failed to create schedule.");
    return;
  }

  renderSuccess(`Schedule created: ${schedule.name} (ID: ${schedule.id})`);
}

export function renderOrgUserScheduleUpdated(
  schedule: OrgUserScheduleDetail | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(schedule, null, 2));
    return;
  }

  if (!schedule) {
    console.log("Failed to update schedule.");
    return;
  }

  renderSuccess(`Schedule updated: ${schedule.name} (ID: ${schedule.id})`);
}

export function renderOrgUserScheduleDeleted(scheduleId: string, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify({ status: "success", message: `Schedule ${scheduleId} deleted` }));
    return;
  }

  renderSuccess(`Schedule ${scheduleId} deleted.`);
}
