import { schedules } from "@trigger.dev/sdk";

import { teamCleanupTaskConfig } from "./config";

export const SOFT_DELETE_RETENTION_DAYS = 0;

export type HardDeleteResult =
  | { status: "success"; deletedCount: 0 }
  | {
      status: "success" | "partial_failure";
      totalFound: number;
      deletedCount: number;
      failedCount: number;
      failedTeamIds: number[];
    };

export async function runHardDeleteSoftDeletedTeams(): Promise<HardDeleteResult> {
  const { TriggerDevLogger } = await import("@calcom/lib/triggerDevLogger");
  const { TeamRepository } = await import("@calcom/features/ee/teams/repositories/TeamRepository");
  const { prisma } = await import("@calcom/prisma");

  const triggerDevLogger = new TriggerDevLogger();
  const log = triggerDevLogger.getSubLogger({
    name: "HardDeleteSoftDeletedTeams",
  });

  log.info(`Starting hard delete of teams soft-deleted more than ${SOFT_DELETE_RETENTION_DAYS} days ago`);

  const teamRepository = new TeamRepository(prisma);
  const teamsToDelete = await teamRepository.findSoftDeletedOlderThan({
    days: SOFT_DELETE_RETENTION_DAYS,
  });

  if (teamsToDelete.length === 0) {
    log.info("No teams found for hard deletion");
    return {
      status: "success",
      deletedCount: 0,
    };
  }

  log.info(`Found ${teamsToDelete.length} teams to hard delete`, {
    teamIds: teamsToDelete.map((t) => t.id),
  });

  let successCount = 0;
  let failedCount = 0;
  const failedTeamIds: number[] = [];

  for (const team of teamsToDelete) {
    try {
      log.info(`Hard deleting team ${team.id} (${team.name})`, {
        teamId: team.id,
        teamName: team.name,
        teamSlug: team.slug,
        isOrganization: team.isOrganization,
        deletedAt: team.deletedAt,
      });

      await teamRepository.deleteById({ id: team.id });
      successCount++;

      log.info(`Successfully hard deleted team ${team.id}`);
    } catch (error) {
      failedCount++;
      failedTeamIds.push(team.id);
      log.error(`Failed to hard delete team ${team.id}`, {
        teamId: team.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  log.info("Hard delete job completed", {
    totalFound: teamsToDelete.length,
    successCount,
    failedCount,
    failedTeamIds,
  });

  return {
    status: failedCount === 0 ? "success" : "partial_failure",
    totalFound: teamsToDelete.length,
    deletedCount: successCount,
    failedCount,
    failedTeamIds,
  };
}

export const hardDeleteSoftDeletedTeams = schedules.task({
  id: "teams.hard-delete-soft-deleted",
  ...teamCleanupTaskConfig,
  cron: {
    pattern: "0 3 * * *",
    timezone: "UTC",
  },
  run: runHardDeleteSoftDeletedTeams,
});
