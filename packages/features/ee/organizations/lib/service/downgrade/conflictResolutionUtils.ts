import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma/client";

// Type for Prisma transaction client
type PrismaTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

const log = logger.getSubLogger({ prefix: ["ConflictResolutionUtils"] });

export type UsernameConflictResolution = {
  userId: number;
  originalUsername: string;
  resolvedUsername: string;
  hadConflict: boolean;
};

export type TeamSlugConflictResolution = {
  teamId: number;
  originalSlug: string;
  resolvedSlug: string;
  hadConflict: boolean;
};

export type ConflictResolutionResult = {
  usernames: UsernameConflictResolution[];
  teamSlugs: TeamSlugConflictResolution[];
};

/**
 * Resolves username conflicts for users being extracted from an organization.
 * If a username conflicts with an existing global username, appends -{orgSlug}.
 * If that still conflicts, appends -{orgSlug}-2, -{orgSlug}-3, etc.
 *
 * @param userIds - Array of user IDs to check for conflicts
 * @param orgSlug - Organization slug to use as suffix
 * @returns Array of username resolutions
 */
export async function resolveUsernameConflicts(
  userIds: number[],
  orgSlug: string
): Promise<UsernameConflictResolution[]> {
  log.debug("Starting username conflict resolution", safeStringify({ userIds, orgSlug }));

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true },
  });

  const resolutions: UsernameConflictResolution[] = [];

  for (const user of users) {
    if (!user.username) {
      resolutions.push({
        userId: user.id,
        originalUsername: "",
        resolvedUsername: "",
        hadConflict: false,
      });
      continue;
    }

    const originalUsername = user.username;
    let candidateUsername = originalUsername;
    let hadConflict = false;
    let counter = 0;

    // Check if original username is available globally
    const conflict = await checkUsernameConflict(candidateUsername, user.id);

    if (conflict) {
      hadConflict = true;
      candidateUsername = `${originalUsername}-${orgSlug}`;

      // If still conflicts, add counter
      while (await checkUsernameConflict(candidateUsername, user.id)) {
        counter++;
        candidateUsername = `${originalUsername}-${orgSlug}-${counter}`;
      }
    }

    resolutions.push({
      userId: user.id,
      originalUsername,
      resolvedUsername: candidateUsername,
      hadConflict,
    });

    log.debug(
      "Username resolution",
      safeStringify({ userId: user.id, originalUsername, resolvedUsername: candidateUsername, hadConflict })
    );
  }

  log.info(
    `Resolved ${resolutions.length} usernames, ${resolutions.filter((r) => r.hadConflict).length} had conflicts`
  );

  return resolutions;
}

/**
 * Resolves team slug conflicts for teams being extracted from an organization.
 * If a team slug conflicts with an existing global slug, appends -{orgSlug}.
 * If that still conflicts, appends -{orgSlug}-2, -{orgSlug}-3, etc.
 *
 * @param teamIds - Array of team IDs to check for conflicts
 * @param orgSlug - Organization slug to use as suffix
 * @returns Array of team slug resolutions
 */
export async function resolveTeamSlugConflicts(
  teamIds: number[],
  orgSlug: string
): Promise<TeamSlugConflictResolution[]> {
  log.debug("Starting team slug conflict resolution", safeStringify({ teamIds, orgSlug }));

  const teams = await prisma.team.findMany({
    where: { id: { in: teamIds } },
    select: { id: true, slug: true },
  });

  const resolutions: TeamSlugConflictResolution[] = [];

  for (const team of teams) {
    if (!team.slug) {
      resolutions.push({
        teamId: team.id,
        originalSlug: "",
        resolvedSlug: "",
        hadConflict: false,
      });
      continue;
    }

    const originalSlug = team.slug;
    let candidateSlug = originalSlug;
    let hadConflict = false;
    let counter = 0;

    // Check if original slug is available globally
    const conflict = await checkTeamSlugConflict(candidateSlug, team.id);

    if (conflict) {
      hadConflict = true;
      candidateSlug = `${originalSlug}-${orgSlug}`;

      // If still conflicts, add counter
      while (await checkTeamSlugConflict(candidateSlug, team.id)) {
        counter++;
        candidateSlug = `${originalSlug}-${orgSlug}-${counter}`;
      }
    }

    resolutions.push({
      teamId: team.id,
      originalSlug,
      resolvedSlug: candidateSlug,
      hadConflict,
    });

    log.debug(
      "Team slug resolution",
      safeStringify({ teamId: team.id, originalSlug, resolvedSlug: candidateSlug, hadConflict })
    );
  }

  log.info(
    `Resolved ${resolutions.length} team slugs, ${resolutions.filter((r) => r.hadConflict).length} had conflicts`
  );

  return resolutions;
}

/**
 * Batch checks all usernames and team slugs for conflicts before processing.
 * This provides a preview of what changes will be made.
 *
 * @param userIds - Array of user IDs to check
 * @param teamIds - Array of team IDs to check
 * @param orgSlug - Organization slug to use as suffix
 * @returns Complete conflict resolution result with all mappings
 */
export async function batchCheckConflicts(
  userIds: number[],
  teamIds: number[],
  orgSlug: string
): Promise<ConflictResolutionResult> {
  log.debug(
    "Starting batch conflict check",
    safeStringify({ usersCount: userIds.length, teamsCount: teamIds.length, orgSlug })
  );

  const [usernames, teamSlugs] = await Promise.all([
    resolveUsernameConflicts(userIds, orgSlug),
    resolveTeamSlugConflicts(teamIds, orgSlug),
  ]);

  const result = { usernames, teamSlugs };

  log.info(
    "Batch conflict check complete",
    safeStringify({
      usernameConflicts: usernames.filter((u) => u.hadConflict).length,
      teamSlugConflicts: teamSlugs.filter((t) => t.hadConflict).length,
    })
  );

  return result;
}

/**
 * Checks if a username conflicts with an existing user (excluding the given user ID).
 *
 * @param username - Username to check
 * @param excludeUserId - User ID to exclude from check
 * @returns True if conflict exists, false otherwise
 */
async function checkUsernameConflict(username: string, excludeUserId: number): Promise<boolean> {
  const existingUser = await prisma.user.findFirst({
    where: {
      username,
      id: { not: excludeUserId },
    },
    select: { id: true },
  });

  return !!existingUser;
}

/**
 * Checks if a team slug conflicts with an existing team (excluding the given team ID).
 *
 * @param slug - Slug to check
 * @param excludeTeamId - Team ID to exclude from check
 * @returns True if conflict exists, false otherwise
 */
async function checkTeamSlugConflict(slug: string, excludeTeamId: number): Promise<boolean> {
  const existingTeam = await prisma.team.findFirst({
    where: {
      slug,
      id: { not: excludeTeamId },
    },
    select: { id: true },
  });

  return !!existingTeam;
}

/**
 * Applies resolved usernames to users in the database.
 *
 * @param tx - Prisma transaction client
 * @param resolutions - Array of username resolutions to apply
 */
export async function applyUsernameResolutions(
  tx: PrismaTransaction,
  resolutions: UsernameConflictResolution[]
): Promise<void> {
  log.info("Applying username resolutions", safeStringify({ count: resolutions.length }));

  for (const resolution of resolutions) {
    if (resolution.resolvedUsername && resolution.resolvedUsername !== resolution.originalUsername) {
      await tx.user.update({
        where: { id: resolution.userId },
        data: { username: resolution.resolvedUsername },
      });

      log.debug(
        "Applied username resolution",
        safeStringify({
          userId: resolution.userId,
          from: resolution.originalUsername,
          to: resolution.resolvedUsername,
        })
      );
    }
  }

  log.info("Username resolutions applied successfully");
}

/**
 * Applies resolved team slugs to teams in the database.
 *
 * @param tx - Prisma transaction client
 * @param resolutions - Array of team slug resolutions to apply
 */
export async function applyTeamSlugResolutions(
  tx: PrismaTransaction,
  resolutions: TeamSlugConflictResolution[]
): Promise<void> {
  log.info("Applying team slug resolutions", safeStringify({ count: resolutions.length }));

  for (const resolution of resolutions) {
    if (resolution.resolvedSlug && resolution.resolvedSlug !== resolution.originalSlug) {
      await tx.team.update({
        where: { id: resolution.teamId },
        data: { slug: resolution.resolvedSlug },
      });

      log.debug(
        "Applied team slug resolution",
        safeStringify({
          teamId: resolution.teamId,
          from: resolution.originalSlug,
          to: resolution.resolvedSlug,
        })
      );
    }
  }

  log.info("Team slug resolutions applied successfully");
}
