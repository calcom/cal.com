import type { Command } from "commander";
import {
  organizationsTeamsSchedulesControllerGetTeamSchedules as getTeamSchedules,
  organizationsTeamsSchedulesControllerGetUserSchedules as getUserSchedules,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import { renderTeamScheduleList, renderUserScheduleList } from "./output";

export function registerTeamSchedulesCommand(program: Command): void {
  const teamSchedulesCmd = program.command("team-schedules").description("Manage schedules for team members");

  teamSchedulesCmd
    .command("list <teamId>")
    .description("List all team member schedules")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--event-type-id <id>", "Filter schedules by event type ID")
    .option("--skip <n>", "Number of items to skip")
    .option("--take <n>", "Maximum number of items to return")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        options: { orgId: string; eventTypeId?: string; skip?: string; take?: string; json?: boolean }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const { data: response } = await getTeamSchedules({
            path: { orgId: Number(options.orgId), teamId: Number(teamId) },
            query: {
              eventTypeId: options.eventTypeId ? Number(options.eventTypeId) : undefined,
              skip: options.skip ? Number(options.skip) : undefined,
              take: options.take ? Number(options.take) : undefined,
            },
            headers: authHeader(),
          });

          renderTeamScheduleList(response?.data, { json: options.json });
        });
      }
    );

  teamSchedulesCmd
    .command("user <teamId> <userId>")
    .description("Get schedules for a specific team member")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--event-type-id <id>", "Filter schedules by event type ID")
    .option("--json", "Output as JSON")
    .action(
      async (teamId: string, userId: string, options: { orgId: string; eventTypeId?: string; json?: boolean }) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const { data: response } = await getUserSchedules({
            path: { orgId: Number(options.orgId), teamId: Number(teamId), userId: Number(userId) },
            query: {
              eventTypeId: options.eventTypeId ? Number(options.eventTypeId) : undefined,
            },
            headers: authHeader(),
          });

          renderUserScheduleList(response?.data, userId, { json: options.json });
        });
      }
    );
}
