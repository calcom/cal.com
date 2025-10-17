import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { PrismaClient } from "@calcom/prisma/client";

import type { ConflictResolutionResult } from "./conflictResolutionUtils";
import type { DowngradeResult } from "./IOrganizationDowngradeService";
import type { ExtractedTeam } from "./teamExtractionUtils";

const log = logger.getSubLogger({ prefix: ["DowngradeAuditLogger"] });

// Type for Prisma transaction client
type PrismaTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export type DowngradeAuditLog = {
  organizationId: number;
  organizationName: string;
  organizationSlug: string | null;
  adminUserId: number;
  adminEmail: string;
  startedAt: Date;
  completedAt?: Date;
  status: "started" | "completed" | "failed";
  error?: string;
  beforeState: {
    totalMembers: number;
    subTeams: number;
    subscriptionId: string | null;
    seats: number | null;
    pricePerSeat: number | null;
  };
  afterState?: {
    extractedTeams: Array<{
      teamId: number;
      teamName: string;
      newSlug: string;
      memberCount: number;
    }>;
    removedMembers: number;
    usernameChanges: number;
    teamSlugChanges: number;
  };
  conflictResolutions: ConflictResolutionResult;
};

/**
 * Logs the start of a downgrade operation.
 * Records the initial state of the organization before any changes.
 *
 * @param organizationId - ID of the organization
 * @param adminUserId - ID of the admin performing the downgrade
 * @param beforeState - State of the organization before downgrade
 * @param conflictResolutions - Conflict resolutions that will be applied
 * @returns Audit log entry
 */
export async function logDowngradeStart(
  organizationId: number,
  organizationName: string,
  organizationSlug: string | null,
  adminUserId: number,
  adminEmail: string,
  beforeState: DowngradeAuditLog["beforeState"],
  conflictResolutions: ConflictResolutionResult
): Promise<DowngradeAuditLog> {
  const auditLog: DowngradeAuditLog = {
    organizationId,
    organizationName,
    organizationSlug,
    adminUserId,
    adminEmail,
    startedAt: new Date(),
    status: "started",
    beforeState,
    conflictResolutions,
  };

  log.info(
    "AUDIT: Downgrade started",
    safeStringify({
      organizationId,
      organizationName,
      adminUserId,
      adminEmail,
      beforeState,
    })
  );

  return auditLog;
}

/**
 * Logs the successful completion of a downgrade operation.
 * Records the final state after all changes.
 *
 * @param auditLog - Initial audit log entry
 * @param result - Downgrade operation result
 * @returns Updated audit log entry
 */
export async function logDowngradeComplete(
  auditLog: DowngradeAuditLog,
  result: DowngradeResult
): Promise<DowngradeAuditLog> {
  const updatedLog: DowngradeAuditLog = {
    ...auditLog,
    completedAt: new Date(),
    status: "completed",
    afterState: {
      extractedTeams: result.teams.map((t) => ({
        teamId: t.teamId,
        teamName: t.teamName,
        newSlug: t.newSlug,
        memberCount: t.memberCount,
      })),
      removedMembers: result.removedMembers.length,
      usernameChanges: result.conflictResolutions.usernames.filter((u) => u.hadConflict).length,
      teamSlugChanges: result.conflictResolutions.teamSlugs.filter((t) => t.hadConflict).length,
    },
  };

  log.info(
    "AUDIT: Downgrade completed",
    safeStringify({
      organizationId: auditLog.organizationId,
      organizationName: auditLog.organizationName,
      duration: updatedLog.completedAt.getTime() - auditLog.startedAt.getTime(),
      extractedTeams: updatedLog.afterState?.extractedTeams.length,
      removedMembers: updatedLog.afterState?.removedMembers,
      usernameChanges: updatedLog.afterState?.usernameChanges,
      teamSlugChanges: updatedLog.afterState?.teamSlugChanges,
    })
  );

  // Log detailed changes
  logDetailedChanges(updatedLog);

  return updatedLog;
}

/**
 * Logs a failed downgrade operation.
 *
 * @param auditLog - Initial audit log entry
 * @param error - Error that caused the failure
 * @returns Updated audit log entry
 */
export async function logDowngradeFailure(
  auditLog: DowngradeAuditLog,
  error: Error | string
): Promise<DowngradeAuditLog> {
  const errorMessage = error instanceof Error ? error.message : error;

  const updatedLog: DowngradeAuditLog = {
    ...auditLog,
    completedAt: new Date(),
    status: "failed",
    error: errorMessage,
  };

  log.error(
    "AUDIT: Downgrade failed",
    safeStringify({
      organizationId: auditLog.organizationId,
      organizationName: auditLog.organizationName,
      adminUserId: auditLog.adminUserId,
      duration: updatedLog.completedAt.getTime() - auditLog.startedAt.getTime(),
      error: errorMessage,
    })
  );

  return updatedLog;
}

/**
 * Logs detailed changes made during downgrade.
 * This provides a comprehensive audit trail for debugging and compliance.
 *
 * @param auditLog - Complete audit log entry
 */
function logDetailedChanges(auditLog: DowngradeAuditLog): void {
  const { conflictResolutions, afterState } = auditLog;

  // Log username changes
  const usernameChanges = conflictResolutions.usernames
    .filter((u) => u.hadConflict)
    .map((u) => ({
      userId: u.userId,
      from: u.originalUsername,
      to: u.resolvedUsername,
    }));

  if (usernameChanges.length > 0) {
    log.info(
      "AUDIT: Username changes",
      safeStringify({
        organizationId: auditLog.organizationId,
        changes: usernameChanges,
      })
    );
  }

  // Log team slug changes
  const teamSlugChanges = conflictResolutions.teamSlugs
    .filter((t) => t.hadConflict)
    .map((t) => ({
      teamId: t.teamId,
      from: t.originalSlug,
      to: t.resolvedSlug,
    }));

  if (teamSlugChanges.length > 0) {
    log.info(
      "AUDIT: Team slug changes",
      safeStringify({
        organizationId: auditLog.organizationId,
        changes: teamSlugChanges,
      })
    );
  }

  // Log extracted teams
  if (afterState?.extractedTeams) {
    log.info(
      "AUDIT: Extracted teams",
      safeStringify({
        organizationId: auditLog.organizationId,
        teams: afterState.extractedTeams,
      })
    );
  }

  // Log billing changes
  if (auditLog.beforeState.subscriptionId) {
    log.info(
      "AUDIT: Billing changes",
      safeStringify({
        organizationId: auditLog.organizationId,
        before: {
          subscriptionId: auditLog.beforeState.subscriptionId,
          seats: auditLog.beforeState.seats,
          pricePerSeat: auditLog.beforeState.pricePerSeat,
        },
        after: "Individual team subscriptions created",
      })
    );
  }
}

/**
 * Creates a summary report of the downgrade operation.
 * Useful for admin dashboards or post-downgrade reviews.
 *
 * @param auditLog - Complete audit log entry
 * @returns Formatted summary report
 */
export function createDowngradeSummary(auditLog: DowngradeAuditLog): string {
  const duration = auditLog.completedAt
    ? auditLog.completedAt.getTime() - auditLog.startedAt.getTime()
    : null;

  const lines = [
    "=== Organization Downgrade Summary ===",
    "",
    `Organization: ${auditLog.organizationName} (${auditLog.organizationSlug})`,
    `Status: ${auditLog.status.toUpperCase()}`,
    `Started: ${auditLog.startedAt.toISOString()}`,
    auditLog.completedAt ? `Completed: ${auditLog.completedAt.toISOString()}` : "",
    duration ? `Duration: ${(duration / 1000).toFixed(2)}s` : "",
    `Performed by: ${auditLog.adminEmail} (ID: ${auditLog.adminUserId})`,
    "",
    "Before State:",
    `  - Total Members: ${auditLog.beforeState.totalMembers}`,
    `  - Sub-Teams: ${auditLog.beforeState.subTeams}`,
    `  - Subscription: ${auditLog.beforeState.subscriptionId || "None"}`,
    `  - Seats: ${auditLog.beforeState.seats || "N/A"}`,
    "",
  ];

  if (auditLog.status === "completed" && auditLog.afterState) {
    lines.push(
      "After State:",
      `  - Teams Extracted: ${auditLog.afterState.extractedTeams.length}`,
      `  - Members Removed: ${auditLog.afterState.removedMembers}`,
      `  - Usernames Changed: ${auditLog.afterState.usernameChanges}`,
      `  - Team Slugs Changed: ${auditLog.afterState.teamSlugChanges}`,
      ""
    );

    lines.push("Extracted Teams:");
    auditLog.afterState.extractedTeams.forEach((team) => {
      lines.push(`  - ${team.teamName} (${team.newSlug}): ${team.memberCount} members`);
    });
  }

  if (auditLog.status === "failed" && auditLog.error) {
    lines.push("", `Error: ${auditLog.error}`);
  }

  lines.push("", "===================================");

  return lines.filter((line) => line !== undefined).join("\n");
}
