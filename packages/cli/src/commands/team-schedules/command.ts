import type { Command } from "commander";
import {
  meControllerGetMe as getMe,
  organizationsTeamsSchedulesControllerGetTeamSchedules as getTeamSchedules,
  organizationsTeamsSchedulesControllerGetUserSchedules as getUserSchedules,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import { renderTeamScheduleList, renderUserScheduleList } from "./output";

async function getOrgId(): Promise<number> {
  const { data: response } = await getMe({ headers: authHeader() });
  const me = response?.data;

  if (!me) {
    throw new Error("Could not fetch your profile. Are you logged in?");
  }
  if (!me.organizationId) {
    throw new Error(
      "Team schedules require an organization. Your account does not belong to an organization."
    );
  }

  return me.organizationId;
}

export function registerTeamSchedulesCommand(program: Command): void {
  const teamSchedulesCmd = program
    .command("team-schedules")
    .description("Manage schedules for team members");

  teamSchedulesCmd
    .command("list <teamId>")
    .description("List all team member schedules")
    .option("--event-type-id <id>", "Filter schedules by event type ID")
    .option("--skip <n>", "Number of items to skip")
    .option("--take <n>", "Maximum number of items to return")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        options: { eventTypeId?: string; skip?: string; take?: string; json?: boolean }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();

          const { data: response } = await getTeamSchedules({
            path: { orgId, teamId: Number(teamId) },
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
    .option("--event-type-id <id>", "Filter schedules by event type ID")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        userId: string,
        options: { eventTypeId?: string; json?: boolean }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();

          const { data: response } = await getUserSchedules({
            path: { orgId, teamId: Number(teamId), userId: Number(userId) },
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
