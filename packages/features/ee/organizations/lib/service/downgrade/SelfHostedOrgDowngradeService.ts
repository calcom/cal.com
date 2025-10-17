import { LicenseKeySingleton } from "@calcom/ee/common/server/LicenseKeyService";
import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { DeploymentRepository } from "@calcom/lib/server/repository/deployment";
import { prisma } from "@calcom/prisma";

import { batchCheckConflicts, applyUsernameResolutions } from "./conflictResolutionUtils";
import type {
  DowngradeValidationResult,
  DowngradeResult,
  IOrganizationDowngradeService,
  DowngradeBlocker,
  DowngradeWarning,
} from "./IOrganizationDowngradeService";
import {
  extractTeamsFromOrganization,
  cleanupOrganizationMembers,
  migrateOrganizationCredits,
  deleteOrganization,
} from "./teamExtractionUtils";
import { createDowngradeRedirects } from "./redirectUtils";
import { logDowngradeStart, logDowngradeComplete, logDowngradeFailure } from "./auditLogger";

const log = logger.getSubLogger({ prefix: ["SelfHostedOrganizationDowngradeService"] });

/**
 * Handles organization downgrade when billing is disabled (self-hosted flow).
 *
 * Flow:
 * 1. Validate organization can be downgraded
 * 2. Validate license allows standalone teams
 * 3. Extract teams from organization (clear parentId)
 * 4. Remove organization-only members
 * 5. Delete organization entity
 * 6. Apply conflict-resolved usernames and slugs
 * 7. No billing changes required
 */
export class SelfHostedOrganizationDowngradeService implements IOrganizationDowngradeService {
  async validateDowngrade(organizationId: number): Promise<DowngradeValidationResult> {
    log.info("Validating organization downgrade (self-hosted)", safeStringify({ organizationId }));

    const blockers: DowngradeBlocker[] = [];
    const warnings: DowngradeWarning[] = [];

    // Get organization details
    const organization = await prisma.team.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        isOrganization: true,
        isPlatform: true,
        members: {
          select: {
            userId: true,
            user: {
              select: {
                id: true,
                email: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!organization) {
      blockers.push({
        type: "insufficient_permissions",
        message: "Organization not found",
      });
      return this.buildValidationResult(false, blockers, warnings, null);
    }

    if (!organization.isOrganization) {
      blockers.push({
        type: "insufficient_permissions",
        message: "This is not an organization",
      });
      return this.buildValidationResult(false, blockers, warnings, null);
    }

    // Check if platform organization (cannot be downgraded)
    if (organization.isPlatform) {
      blockers.push({
        type: "platform_dependency",
        message: "Platform organizations cannot be downgraded",
        details: { isPlatform: true },
      });
    }

    // Validate license for self-hosted
    if (IS_SELF_HOSTED) {
      const deploymentRepo = new DeploymentRepository(prisma);
      const licenseKeyService = await LicenseKeySingleton.getInstance(deploymentRepo);
      const hasValidLicense = await licenseKeyService.checkLicense();

      if (!hasValidLicense) {
        blockers.push({
          type: "insufficient_permissions",
          message: "Self-hosted license not valid",
        });
      }
    }

    // Get sub-teams
    const subTeams = await prisma.team.findMany({
      where: { parentId: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    // Warn about data loss
    warnings.push({
      type: "data_loss",
      message: "Organization-level branding, settings, and configurations will be lost",
    });

    // Warn about URL changes
    if (organization.slug) {
      warnings.push({
        type: "url_change",
        message: `Your organization URL (${organization.slug}.cal.com) will no longer be accessible`,
      });
    }

    // Get conflict resolutions
    const userIds = organization.members.map((m) => m.userId);
    const teamIds = subTeams.map((t) => t.id);
    const orgSlug = organization.slug || "org";

    const conflictResolutions = await batchCheckConflicts(userIds, teamIds, orgSlug);

    // Get organization's credit balance
    const orgCreditBalance = await prisma.creditBalance.findUnique({
      where: { teamId: organizationId },
      select: {
        additionalCredits: true,
      },
    });

    const organizationCredits = orgCreditBalance?.additionalCredits || 0;

    // Prepare available teams for credit selection
    const availableTeamsForCredits = subTeams.map((team) => ({
      teamId: team.id,
      teamName: team.name,
      memberCount: team._count.members,
    }));

    const canDowngrade = blockers.length === 0;

    return this.buildValidationResult(
      canDowngrade,
      blockers,
      warnings,
      conflictResolutions,
      availableTeamsForCredits,
      organizationCredits
    );
  }

  async downgradeOrganization(
    organizationId: number,
    adminUserId?: number,
    targetTeamIdForCredits?: number
  ): Promise<DowngradeResult> {
    log.info("Starting organization downgrade (self-hosted)", safeStringify({ organizationId, adminUserId }));

    const errors: string[] = [];
    let auditLog: Awaited<ReturnType<typeof logDowngradeStart>> | null = null;

    try {
      // Validate first
      const validation = await this.validateDowngrade(organizationId);
      if (!validation.canDowngrade) {
        throw new Error(
          `Cannot downgrade organization: ${validation.blockers.map((b) => b.message).join(", ")}`
        );
      }

      const organization = await prisma.team.findUniqueOrThrow({
        where: { id: organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
          metadata: true,
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      const subTeamsCount = await prisma.team.count({
        where: { parentId: organizationId },
      });

      const orgSlug = organization.slug || "org";

      // Get admin user info for audit log
      const adminUser = adminUserId
        ? await prisma.user.findUnique({
            where: { id: adminUserId },
            select: { email: true },
          })
        : null;

      // Start audit log
      auditLog = await logDowngradeStart(
        organizationId,
        organization.name,
        organization.slug,
        adminUserId || 0,
        adminUser?.email || "system",
        {
          totalMembers: organization._count.members,
          subTeams: subTeamsCount,
          subscriptionId: null,
          seats: null,
          pricePerSeat: null,
        },
        validation.conflictResolutions
      );

      // Execute all database operations in a transaction
      const { extractedTeams, removedMembers } = await prisma.$transaction(async (tx) => {
        // Step 1: Extract teams from organization
        const { teamSlugs } = validation.conflictResolutions;
        const extractedTeams = await extractTeamsFromOrganization(tx, organizationId, teamSlugs);

        // Step 2: Apply username resolutions
        const { usernames } = validation.conflictResolutions;
        await applyUsernameResolutions(tx, usernames);

        // Step 3: Create redirects for changed usernames and team slugs
        await createDowngradeRedirects(tx, orgSlug, usernames, teamSlugs);

        // Step 4: Migrate credits
        const teamIds = extractedTeams.map((t) => t.teamId);
        await migrateOrganizationCredits(tx, organizationId, teamIds, targetTeamIdForCredits);

        // Step 5: Remove organization-only members
        const removedMembers = await cleanupOrganizationMembers(tx, organizationId);

        // Step 6: Delete organization
        await deleteOrganization(tx, organizationId);

        return { extractedTeams, removedMembers };
      });

      log.info("Organization downgrade complete (self-hosted)", safeStringify({ organizationId }));

      const result: DowngradeResult = {
        success: errors.length === 0,
        organizationId,
        deletedAt: new Date(),
        teams: extractedTeams.map((t) => ({
          teamId: t.teamId,
          teamName: t.teamName,
          newSlug: t.newSlug,
          subscriptionId: null, // No subscriptions in self-hosted
          memberCount: t.memberCount,
        })),
        removedMembers,
        conflictResolutions: validation.conflictResolutions,
        errors: errors.length > 0 ? errors : undefined,
      };

      // Log completion
      await logDowngradeComplete(auditLog, result);

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.error("Organization downgrade failed (self-hosted)", safeStringify({ organizationId, error: errorMsg }));

      // Log failure if auditLog exists
      if (auditLog) {
        await logDowngradeFailure(auditLog, error instanceof Error ? error : errorMsg);
      }

      return {
        success: false,
        organizationId,
        deletedAt: new Date(),
        teams: [],
        removedMembers: [],
        conflictResolutions: { usernames: [], teamSlugs: [] },
        errors: [...errors, errorMsg],
      };
    }
  }

  private buildValidationResult(
    canDowngrade: boolean,
    blockers: DowngradeBlocker[],
    warnings: DowngradeWarning[],
    conflictResolutions: any,
    availableTeamsForCredits: Array<{ teamId: number; teamName: string; memberCount: number }>,
    organizationCredits: number
  ): DowngradeValidationResult {
    return {
      canDowngrade,
      blockers,
      warnings,
      conflictResolutions: conflictResolutions || { usernames: [], teamSlugs: [] },
      estimatedCost: {
        current: { totalMonthly: 0, seats: 0, pricePerSeat: 0 },
        afterDowngrade: { totalMonthly: 0, teams: [] },
      },
      availableTeamsForCredits,
      organizationCredits,
    };
  }
}
