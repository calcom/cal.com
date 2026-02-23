import chalk from "chalk";
import type { Command } from "commander";
import { apiRequest } from "../lib/api";
import { handleOutput, outputError, outputSuccess, outputTable } from "../lib/output";

interface ScheduleAvailability {
  days: string[];
  startTime: string;
  endTime: string;
}

interface Schedule {
  id: number;
  name: string;
  timeZone: string;
  isDefault: boolean;
  availability: ScheduleAvailability[];
  overrides: unknown[];
}

function formatDefaultLabel(isDefault: boolean): string {
  if (isDefault) {
    return "Yes";
  }
  return "No";
}

function formatScheduleDetail(schedule: Schedule): void {
  console.log(chalk.bold(`\nSchedule: ${schedule.name}`));
  console.log(`  ID:       ${schedule.id}`);
  console.log(`  Timezone: ${schedule.timeZone}`);
  console.log(`  Default:  ${formatDefaultLabel(schedule.isDefault)}`);
  if (schedule.availability?.length) {
    console.log("  Availability:");
    for (const a of schedule.availability) {
      console.log(`    ${a.days.join(", ")}: ${a.startTime} - ${a.endTime}`);
    }
  }
  console.log();
}

function registerScheduleQueryCommands(schedules: Command): void {
  schedules
    .command("list")
    .description("List all schedules")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      const response = await apiRequest<Schedule[]>("/v2/schedules", {
        headers: { "cal-api-version": "2024-06-11" },
      });

      handleOutput(response.data, options, (data) => {
        if (!data || data.length === 0) {
          console.log("No schedules found.");
          return;
        }
        outputTable(
          ["ID", "Name", "Timezone", "Default"],
          data.map((s) => {
            return [String(s.id), s.name, s.timeZone, formatDefaultLabel(s.isDefault)];
          })
        );
      });
    });

  schedules
    .command("get <scheduleId>")
    .description("Get a schedule by ID")
    .option("--json", "Output as JSON")
    .action(async (scheduleId: string, options: { json?: boolean }) => {
      const response = await apiRequest<Schedule>(`/v2/schedules/${scheduleId}`, {
        headers: { "cal-api-version": "2024-06-11" },
      });

      handleOutput(response.data, options, (data) => {
        if (!data) {
          outputError("Schedule not found.");
          return;
        }
        formatScheduleDetail(data);
      });
    });

  schedules
    .command("get-default")
    .description("Get the default schedule")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      const response = await apiRequest<Schedule>("/v2/schedules/default", {
        headers: { "cal-api-version": "2024-06-11" },
      });

      handleOutput(response.data, options, (data) => {
        if (!data) {
          outputError("No default schedule found.");
          return;
        }
        formatScheduleDetail(data);
      });
    });
}

function registerScheduleMutationCommands(schedules: Command): void {
  schedules
    .command("create")
    .description("Create a schedule")
    .requiredOption("--name <name>", "Schedule name")
    .requiredOption("--timezone <tz>", "Timezone (e.g. America/New_York)")
    .option("--is-default", "Set as default schedule")
    .option("--json", "Output as JSON")
    .action(async (options: { name: string; timezone: string; isDefault?: boolean; json?: boolean }) => {
      const body: Record<string, unknown> = {
        name: options.name,
        timeZone: options.timezone,
      };
      if (options.isDefault) body.isDefault = true;

      const response = await apiRequest<Schedule>("/v2/schedules", {
        method: "POST",
        body,
        headers: { "cal-api-version": "2024-06-11" },
      });

      handleOutput(response.data, options, (data) => {
        if (!data) {
          outputError("Failed to create schedule.");
          return;
        }
        outputSuccess(`Schedule created: ${data.name} (ID: ${data.id})`);
      });
    });

  schedules
    .command("update <scheduleId>")
    .description("Update a schedule")
    .option("--name <name>", "New name")
    .option("--timezone <tz>", "New timezone")
    .option("--is-default", "Set as default schedule")
    .option("--json", "Output as JSON")
    .action(
      async (
        scheduleId: string,
        options: {
          name?: string;
          timezone?: string;
          isDefault?: boolean;
          json?: boolean;
        }
      ) => {
        const body: Record<string, unknown> = {};
        if (options.name) body.name = options.name;
        if (options.timezone) body.timeZone = options.timezone;
        if (options.isDefault) body.isDefault = true;

        const response = await apiRequest<Schedule>(`/v2/schedules/${scheduleId}`, {
          method: "PATCH",
          body,
          headers: { "cal-api-version": "2024-06-11" },
        });

        handleOutput(response.data, options, (data) => {
          if (!data) {
            outputError("Failed to update schedule.");
            return;
          }
          outputSuccess(`Schedule updated: ${data.name} (ID: ${data.id})`);
        });
      }
    );

  schedules
    .command("delete <scheduleId>")
    .description("Delete a schedule")
    .option("--json", "Output as JSON")
    .action(async (scheduleId: string, options: { json?: boolean }) => {
      await apiRequest<void>(`/v2/schedules/${scheduleId}`, {
        method: "DELETE",
        headers: { "cal-api-version": "2024-06-11" },
      });

      if (options.json) {
        console.log(JSON.stringify({ status: "success", message: `Schedule ${scheduleId} deleted` }));
      } else {
        outputSuccess(`Schedule ${scheduleId} deleted.`);
      }
    });
}

export function registerSchedulesCommand(program: Command): void {
  const schedules = program.command("schedules").description("Manage schedules");
  registerScheduleQueryCommands(schedules);
  registerScheduleMutationCommands(schedules);
}
