import type { Command } from "commander";
import {
  organizationsSchedulesControllerCreateUserSchedule as createSchedule,
  organizationsSchedulesControllerDeleteUserSchedule as deleteSchedule,
  organizationsSchedulesControllerGetUserSchedule as getSchedule,
  organizationsSchedulesControllerGetUserSchedules as getSchedules,
  organizationsSchedulesControllerUpdateUserSchedule as updateSchedule,
} from "../../generated/sdk.gen";
import type {
  CreateScheduleInput_2024_06_11,
  UpdateScheduleInput_2024_06_11,
} from "../../generated/types.gen";
import { initializeClient } from "../../shared/client";
import { ApiVersion } from "../../shared/constants";
import { withErrorHandling } from "../../shared/errors";
import { apiVersionHeader } from "../../shared/headers";
import {
  renderOrgUserSchedule,
  renderOrgUserScheduleCreated,
  renderOrgUserScheduleDeleted,
  renderOrgUserScheduleList,
  renderOrgUserScheduleUpdated,
} from "./output";

function registerOrgUserScheduleQueryCommands(schedulesCmd: Command): void {
  schedulesCmd
    .command("list <userId>")
    .description("List all schedules for an organization user")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (userId: string, options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = Number(options.orgId);

        const { data: response } = await getSchedules({
          path: { orgId, userId: Number(userId) },
          headers: apiVersionHeader(ApiVersion.V2024_06_11),
        });

        renderOrgUserScheduleList(response?.data, options);
      });
    });

  schedulesCmd
    .command("get <userId> <scheduleId>")
    .description("Get a schedule by ID for an organization user")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (userId: string, scheduleId: string, options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = Number(options.orgId);

        const { data: response } = await getSchedule({
          path: { orgId, userId: Number(userId), scheduleId: Number(scheduleId) },
          headers: apiVersionHeader(ApiVersion.V2024_06_11),
        });

        renderOrgUserSchedule(response?.data, options);
      });
    });
}

function registerOrgUserScheduleMutationCommands(schedulesCmd: Command): void {
  schedulesCmd
    .command("create <userId>")
    .description("Create a schedule for an organization user")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .requiredOption("--name <name>", "Schedule name")
    .requiredOption("--timezone <tz>", "Timezone (e.g. America/New_York)")
    .option("--is-default", "Set as default schedule")
    .option("--json", "Output as JSON")
    .action(
      async (
        userId: string,
        options: { orgId: string; name: string; timezone: string; isDefault?: boolean; json?: boolean }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = Number(options.orgId);

          const body: CreateScheduleInput_2024_06_11 = {
            name: options.name,
            timeZone: options.timezone,
            isDefault: options.isDefault ?? false,
          };

          const { data: response } = await createSchedule({
            path: { orgId, userId: Number(userId) },
            body,
            headers: apiVersionHeader(ApiVersion.V2024_06_11),
          });

          renderOrgUserScheduleCreated(response?.data, options);
        });
      }
    );

  schedulesCmd
    .command("update <userId> <scheduleId>")
    .description("Update a schedule for an organization user")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--name <name>", "New name")
    .option("--timezone <tz>", "New timezone")
    .option("--is-default", "Set as default schedule")
    .option("--json", "Output as JSON")
    .action(
      async (
        userId: string,
        scheduleId: string,
        options: { orgId: string; name?: string; timezone?: string; isDefault?: boolean; json?: boolean }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = Number(options.orgId);

          const body: UpdateScheduleInput_2024_06_11 = {};

          if (options.name) body.name = options.name;
          if (options.timezone) body.timeZone = options.timezone;
          if (options.isDefault !== undefined) body.isDefault = options.isDefault;

          const { data: response } = await updateSchedule({
            path: { orgId, userId: Number(userId), scheduleId: Number(scheduleId) },
            body,
            headers: apiVersionHeader(ApiVersion.V2024_06_11),
          });

          renderOrgUserScheduleUpdated(response?.data, options);
        });
      }
    );

  schedulesCmd
    .command("delete <userId> <scheduleId>")
    .description("Delete a schedule for an organization user")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (userId: string, scheduleId: string, options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = Number(options.orgId);

        await deleteSchedule({
          path: { orgId, userId: Number(userId), scheduleId: Number(scheduleId) },
          headers: apiVersionHeader(ApiVersion.V2024_06_11),
        });

        renderOrgUserScheduleDeleted(scheduleId, options);
      });
    });
}

export function registerOrgUserSchedulesCommand(program: Command): void {
  const schedulesCmd = program
    .command("org-user-schedules")
    .description("Manage schedules for organization users");
  registerOrgUserScheduleQueryCommands(schedulesCmd);
  registerOrgUserScheduleMutationCommands(schedulesCmd);
}
