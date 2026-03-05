import type { Command } from "commander";
import {
  schedulesController20240611CreateSchedule as createSchedule,
  schedulesController20240611DeleteSchedule as deleteSchedule,
  schedulesController20240611GetDefaultSchedule as getDefaultSchedule,
  schedulesController20240611GetSchedule as getSchedule,
  schedulesController20240611GetSchedules as getSchedules,
  schedulesController20240611UpdateSchedule as updateSchedule,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { ApiVersion } from "../../shared/constants";
import { withErrorHandling } from "../../shared/errors";
import { apiVersionHeader } from "../../shared/headers";
import {
  renderSchedule,
  renderScheduleCreated,
  renderScheduleDeleted,
  renderScheduleList,
  renderScheduleUpdated,
} from "./output";

function registerScheduleQueryCommands(schedulesCmd: Command): void {
  schedulesCmd
    .command("list")
    .description("List all schedules")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const { data: response } = await getSchedules({
          headers: apiVersionHeader(ApiVersion.V2024_06_11),
        });
        renderScheduleList(response?.data, options);
      });
    });

  schedulesCmd
    .command("get <scheduleId>")
    .description("Get a schedule by ID")
    .option("--json", "Output as JSON")
    .action(async (scheduleId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const { data: response } = await getSchedule({
          path: { scheduleId: Number(scheduleId) },
          headers: apiVersionHeader(ApiVersion.V2024_06_11),
        });
        renderSchedule(response?.data, options);
      });
    });

  schedulesCmd
    .command("get-default")
    .description("Get the default schedule")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const { data: response } = await getDefaultSchedule({
          headers: apiVersionHeader(ApiVersion.V2024_06_11),
        });
        renderSchedule(response?.data, options);
      });
    });
}

function registerScheduleMutationCommands(schedulesCmd: Command): void {
  schedulesCmd
    .command("create")
    .description("Create a schedule")
    .requiredOption("--name <name>", "Schedule name")
    .requiredOption("--timezone <tz>", "Timezone (e.g. America/New_York)")
    .option("--is-default", "Set as default schedule")
    .option("--json", "Output as JSON")
    .action(async (options: { name: string; timezone: string; isDefault?: boolean; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const { data: response } = await createSchedule({
          body: {
            name: options.name,
            timeZone: options.timezone,
            isDefault: options.isDefault || false,
          },
          headers: apiVersionHeader(ApiVersion.V2024_06_11),
        });
        renderScheduleCreated(response?.data, options);
      });
    });

  schedulesCmd
    .command("update <scheduleId>")
    .description("Update a schedule")
    .option("--name <name>", "New name")
    .option("--timezone <tz>", "New timezone")
    .option("--is-default", "Set as default schedule")
    .option("--json", "Output as JSON")
    .action(
      async (
        scheduleId: string,
        options: { name?: string; timezone?: string; isDefault?: boolean; json?: boolean }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const { data: response } = await updateSchedule({
            path: { scheduleId },
            body: {
              name: options.name,
              timeZone: options.timezone,
              isDefault: options.isDefault,
            },
            headers: apiVersionHeader(ApiVersion.V2024_06_11),
          });
          renderScheduleUpdated(response?.data, options);
        });
      }
    );

  schedulesCmd
    .command("delete <scheduleId>")
    .description("Delete a schedule")
    .option("--json", "Output as JSON")
    .action(async (scheduleId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        await deleteSchedule({
          path: { scheduleId: Number(scheduleId) },
          headers: apiVersionHeader(ApiVersion.V2024_06_11),
        });
        renderScheduleDeleted(scheduleId, options);
      });
    });
}

export function registerSchedulesCommand(program: Command): void {
  const schedulesCmd = program.command("schedules").description("Manage schedules");
  registerScheduleQueryCommands(schedulesCmd);
  registerScheduleMutationCommands(schedulesCmd);
}
