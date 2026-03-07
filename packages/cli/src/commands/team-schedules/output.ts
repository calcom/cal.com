import chalk from "chalk";
import { type OutputOptions, renderDetail, renderHeader, renderTable } from "../../shared/output";
import type { TeamSchedule } from "./types";

function formatDefaultLabel(isDefault: boolean): string {
  return isDefault ? "Yes" : "No";
}

function renderScheduleDetail(schedule: TeamSchedule | null): void {
  if (!schedule) return;
  renderHeader(`Schedule: ${schedule.name}`);
  renderDetail([
    ["ID:", String(schedule.id)],
    ["Owner ID:", String(schedule.ownerId)],
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

export function renderTeamScheduleList(
  schedules: TeamSchedule[] | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(schedules, null, 2));
    return;
  }

  if (!schedules?.length) {
    console.log("No schedules found for this team.");
    return;
  }

  renderTable(
    ["ID", "Owner ID", "Name", "Timezone", "Default"],
    schedules.map((s) => [
      String(s.id),
      String(s.ownerId),
      s.name,
      s.timeZone,
      formatDefaultLabel(s.isDefault),
    ])
  );
}

export function renderUserScheduleList(
  schedules: TeamSchedule[] | undefined,
  userId: string,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(schedules, null, 2));
    return;
  }

  if (!schedules?.length) {
    console.log(`No schedules found for user ${userId} in this team.`);
    return;
  }

  renderHeader(`Schedules for user ${userId}`);
  for (const schedule of schedules) {
    renderScheduleDetail(schedule);
  }
}
