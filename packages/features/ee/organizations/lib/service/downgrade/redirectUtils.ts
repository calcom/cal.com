import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { PrismaClient } from "@calcom/prisma/client";

import type { TeamSlugConflictResolution, UsernameConflictResolution } from "./conflictResolutionUtils";

const log = logger.getSubLogger({ prefix: ["RedirectUtils"] });

// Type for Prisma transaction client
type PrismaTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Creates TempOrgRedirect entries for usernames that changed during downgrade.
 * This ensures old organization-scoped URLs still work (e.g., org.cal.com/john -> john-acmecorp.cal.com)
 *
 * @param tx - Prisma transaction client
 * @param orgSlug - Organization slug
 * @param usernameResolutions - Array of username conflict resolutions
 */
export async function createUsernameRedirects(
  tx: PrismaTransaction,
  orgSlug: string,
  usernameResolutions: UsernameConflictResolution[]
): Promise<void> {
  log.info(
    "Creating username redirects",
    safeStringify({ orgSlug, count: usernameResolutions.length })
  );

  for (const resolution of usernameResolutions) {
    if (!resolution.originalUsername) continue;

    // Create redirect from org-scoped URL to new global username
    const fromPath = `/${orgSlug}/${resolution.originalUsername}`;
    const toUrl = `/${resolution.resolvedUsername}`;

    try {
      await tx.tempOrgRedirect.create({
        data: {
          from: fromPath,
          fromOrgId: 0, // Special marker for downgrade redirects
          type: "user",
          toUrl,
          enabled: true,
        },
      });

      log.debug(
        "Created username redirect",
        safeStringify({ from: fromPath, to: toUrl, userId: resolution.userId })
      );
    } catch (error) {
      log.warn(
        "Failed to create username redirect (may already exist)",
        safeStringify({ from: fromPath, to: toUrl, error: error instanceof Error ? error.message : error })
      );
    }
  }

  log.info("Username redirects created");
}

/**
 * Creates TempOrgRedirect entries for teams that changed slugs during downgrade.
 * This ensures old organization team URLs still work (e.g., org.cal.com/team/engineering -> engineering-acmecorp.cal.com)
 *
 * @param tx - Prisma transaction client
 * @param orgSlug - Organization slug
 * @param teamSlugResolutions - Array of team slug conflict resolutions
 */
export async function createTeamRedirects(
  tx: PrismaTransaction,
  orgSlug: string,
  teamSlugResolutions: TeamSlugConflictResolution[]
): Promise<void> {
  log.info(
    "Creating team redirects",
    safeStringify({ orgSlug, count: teamSlugResolutions.length })
  );

  for (const resolution of teamSlugResolutions) {
    if (!resolution.originalSlug) continue;

    // Create redirect from org-scoped team URL to new global team slug
    const fromPath = `/${orgSlug}/team/${resolution.originalSlug}`;
    const toUrl = `/${resolution.resolvedSlug}`;

    try {
      await tx.tempOrgRedirect.create({
        data: {
          from: fromPath,
          fromOrgId: 0, // Special marker for downgrade redirects
          type: "team",
          toUrl,
          enabled: true,
        },
      });

      log.debug(
        "Created team redirect",
        safeStringify({ from: fromPath, to: toUrl, teamId: resolution.teamId })
      );
    } catch (error) {
      log.warn(
        "Failed to create team redirect (may already exist)",
        safeStringify({ from: fromPath, to: toUrl, error: error instanceof Error ? error.message : error })
      );
    }
  }

  log.info("Team redirects created");
}

/**
 * Creates all necessary redirects for a downgraded organization.
 * This includes both username and team slug redirects.
 *
 * @param tx - Prisma transaction client
 * @param orgSlug - Organization slug
 * @param usernameResolutions - Array of username conflict resolutions
 * @param teamSlugResolutions - Array of team slug conflict resolutions
 */
export async function createDowngradeRedirects(
  tx: PrismaTransaction,
  orgSlug: string,
  usernameResolutions: UsernameConflictResolution[],
  teamSlugResolutions: TeamSlugConflictResolution[]
): Promise<void> {
  log.info("Creating all downgrade redirects", safeStringify({ orgSlug }));

  await Promise.all([
    createUsernameRedirects(tx, orgSlug, usernameResolutions),
    createTeamRedirects(tx, orgSlug, teamSlugResolutions),
  ]);

  log.info("All downgrade redirects created");
}

/**
 * Cleans up old redirects for an organization.
 * Useful if you need to re-run a downgrade or clean up after a failed downgrade.
 *
 * @param tx - Prisma transaction client
 * @param orgSlug - Organization slug
 */
export async function cleanupOrganizationRedirects(
  tx: PrismaTransaction,
  orgSlug: string
): Promise<void> {
  log.info("Cleaning up organization redirects", safeStringify({ orgSlug }));

  const result = await tx.tempOrgRedirect.deleteMany({
    where: {
      from: {
        startsWith: `/${orgSlug}/`,
      },
    },
  });

  log.info(
    "Organization redirects cleaned up",
    safeStringify({ orgSlug, deletedCount: result.count })
  );
}
