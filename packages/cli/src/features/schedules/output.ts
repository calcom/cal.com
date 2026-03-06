import chalk from "chalk";
import { type OutputOptions, renderSuccess, renderTable } from "../../shared/output";
import type { Schedule, ScheduleDetail } from "./types";

function formatDefaultLabel(isDefault: boolean): string {
  return isDefault ? "Yes" : "No";
}

function renderScheduleDetail(schedule: Schedule | ScheduleDetail | null): void {
  if (!schedule) return;
  console.log(chalk.bold(`\nSchedule: ${schedule.name}`));
  console.log(`  ID:       ${schedule.id}`);
  console.log(`  Timezone: ${schedule.timeZone}`);
  console.log(`  Default:  ${formatDefaultLabel(schedule.isDefault)}`);
  if (schedule.availability?.length) {
    console.log("  Availability:");
    for (const a of schedule.availability) {
      console.log(`    ${a.days}: ${a.startTime} - ${a.endTime}`);
    }
  }
  console.log();
}

export function renderSchedule(schedule: ScheduleDetail | undefined, { json }: OutputOptions = {}): void {
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

export function renderScheduleList(schedules: Schedule[] | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(schedules, null, 2));
    return;
  }

  if (!schedules?.length) {
    console.log("No schedules found.");
    return;
  }

  renderTable(
    ["ID", "Name", "Timezone", "Default"],
    schedules.map((s) => [String(s.id), s.name, s.timeZone, formatDefaultLabel(s.isDefault)])
  );
}

export function renderScheduleCreated(
  schedule: ScheduleDetail | undefined,
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

export function renderScheduleUpdated(
  schedule: ScheduleDetail | undefined,
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

export function renderScheduleDeleted(scheduleId: string, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify({ status: "success", message: `Schedule ${scheduleId} deleted` }));
    return;
  }

  renderSuccess(`Schedule ${scheduleId} deleted.`);
}
