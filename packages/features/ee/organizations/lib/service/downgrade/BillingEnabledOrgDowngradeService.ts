import billing from "@calcom/features/ee/billing";
import { TeamBilling } from "@calcom/features/ee/billing/teams";
import { MINIMUM_NUMBER_OF_ORG_SEATS, WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import { teamMetadataStrictSchema } from "@calcom/prisma/zod-utils";

import type {
  DowngradeValidationResult,
  DowngradeResult,
  IOrganizationDowngradeService,
  DowngradeBlocker,
  DowngradeWarning,
} from "./IOrganizationDowngradeService";
import {
  batchCheckConflicts,
  resolveUsernameConflicts,
  applyUsernameResolutions,
} from "./conflictResolutionUtils";
import {
  extractTeamsFromOrganization,
  createTeamSubscriptions,
  cleanupOrganizationMembers,
  migrateOrganizationCredits,
  deleteOrganization,
} from "./teamExtractionUtils";
import { createDowngradeRedirects } from "./redirectUtils";
import { logDowngradeStart, logDowngradeComplete, logDowngradeFailure } from "./auditLogger";

const log = logger.getSubLogger({ prefix: ["BillingEnabledOrgDowngradeService"] });

const teamPaymentMetadataSchema = teamMetadataStrictSchema.unwrap();

/**
 * Handles organization downgrade when billing is enabled (Stripe flow).
 *
 * Flow:
 * 1. Validate organization can be downgraded (check for blockers)
 * 2. Cancel organization Stripe subscription
 * 3. Extract teams from organization (clear parentId)
 * 4. Create individual Stripe subscriptions for each team
 * 5. Remove organization-only members
 * 6. Delete organization entity
 * 7. Apply conflict-resolved usernames and slugs
 */
export class BillingEnabledOrgDowngradeService implements IOrganizationDowngradeService {
  async validateDowngrade(organizationId: number): Promise<DowngradeValidationResult> {
    log.info("Validating organization downgrade", safeStringify({ organizationId }));

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
        metadata: true,
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
      return this.buildValidationResult(false, blockers, warnings, null, null, [], 0);
    }

    if (!organization.isOrganization) {
      blockers.push({
        type: "insufficient_permissions",
        message: "This is not an organization",
      });
      return this.buildValidationResult(false, blockers, warnings, null, null, [], 0);
    }

    // Check if platform organization (cannot be downgraded)
    if (organization.isPlatform) {
      blockers.push({
        type: "platform_dependency",
        message: "Platform organizations cannot be downgraded",
        details: { isPlatform: true },
      });
    }

    // Check for active subscription
    const metadata = teamPaymentMetadataSchema.parse(organization.metadata || {});
    const { subscriptionId } = metadata;

    if (subscriptionId) {
      try {
        const subscription = await billing.getSubscriptionStatus(subscriptionId);

        // Check if annual subscription
        if (subscription?.billing_cycle_anchor) {
          // This is a simplified check - in production, you'd want to check the interval
          warnings.push({
            type: "billing_change",
            message: "You have an active subscription that will be cancelled",
            details: { subscriptionId, status: subscription.status },
          });
        }
      } catch (error) {
        log.warn("Could not fetch subscription status", safeStringify({ subscriptionId, error }));
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

    // Check for active integrations (simplified check)
    const hasActiveIntegrations = await this.checkForActiveIntegrations(organizationId);
    if (hasActiveIntegrations) {
      warnings.push({
        type: "feature_loss",
        message: "Some organization-level integrations may stop working",
      });
    }

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

    // Calculate cost estimate
    const currentCost = await this.calculateCurrentCost(organization, metadata);
    const afterDowngradeCost = await this.calculateAfterDowngradeCost(subTeams);

    const canDowngrade = blockers.length === 0;

    return this.buildValidationResult(
      canDowngrade,
      blockers,
      warnings,
      conflictResolutions,
      {
        current: currentCost,
        afterDowngrade: afterDowngradeCost,
      },
      availableTeamsForCredits,
      organizationCredits
    );
  }

  async downgradeOrganization(
    organizationId: number,
    adminUserId?: number,
    targetTeamIdForCredits?: number
  ): Promise<DowngradeResult> {
    log.info("Starting organization downgrade", safeStringify({ organizationId, adminUserId }));

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

      const metadata = teamPaymentMetadataSchema.parse(organization.metadata || {});
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
          subscriptionId: metadata.subscriptionId || null,
          seats: metadata.orgSeats || null,
          pricePerSeat: metadata.pricePerSeat || null,
        },
        validation.conflictResolutions
      );

      // Step 1: Cancel organization subscription (outside transaction - Stripe API call)
      if (metadata.subscriptionId) {
        log.info(
          "Cancelling organization subscription",
          safeStringify({ subscriptionId: metadata.subscriptionId })
        );
        try {
          await billing.handleSubscriptionCancel(metadata.subscriptionId);
        } catch (error) {
          const errorMsg = `Failed to cancel subscription: ${
            error instanceof Error ? error.message : String(error)
          }`;
          log.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      // Step 2-8: Execute all database operations in a transaction
      const { extractedTeams, removedMembers } = await prisma.$transaction(async (tx) => {
        // Step 2: Extract teams from organization
        const { teamSlugs } = validation.conflictResolutions;
        const extractedTeams = await extractTeamsFromOrganization(tx, organizationId, teamSlugs);

        // Step 3: Apply username resolutions
        const { usernames } = validation.conflictResolutions;
        await applyUsernameResolutions(tx, usernames);

        // Step 4: Create redirects for changed usernames and team slugs
        await createDowngradeRedirects(tx, orgSlug, usernames, teamSlugs);

        // Step 5: Migrate credits
        const teamIds = extractedTeams.map((t) => t.teamId);
        await migrateOrganizationCredits(tx, organizationId, teamIds, targetTeamIdForCredits);

        // Step 6: Remove organization-only members
        const removedMembers = await cleanupOrganizationMembers(tx, organizationId);

        // Step 7: Delete organization
        await deleteOrganization(tx, organizationId);

        return { extractedTeams, removedMembers };
      });

      // Step 8: Create team subscriptions (outside transaction - Stripe API calls)
      const teamsWithSubscriptions = await createTeamSubscriptions(extractedTeams);

      log.info("Organization downgrade complete", safeStringify({ organizationId }));

      const result: DowngradeResult = {
        success: errors.length === 0,
        organizationId,
        deletedAt: new Date(),
        teams: teamsWithSubscriptions.map((t) => ({
          teamId: t.teamId,
          teamName: t.teamName,
          newSlug: t.newSlug,
          subscriptionId: t.subscriptionId,
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
      log.error("Organization downgrade failed", safeStringify({ organizationId, error: errorMsg }));

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
    estimatedCost: any,
    availableTeamsForCredits: Array<{ teamId: number; teamName: string; memberCount: number }>,
    organizationCredits: number
  ): DowngradeValidationResult {
    return {
      canDowngrade,
      blockers,
      warnings,
      conflictResolutions: conflictResolutions || { usernames: [], teamSlugs: [] },
      estimatedCost: estimatedCost || {
        current: { totalMonthly: 0, seats: 0, pricePerSeat: 0 },
        afterDowngrade: { totalMonthly: 0, teams: [] },
      },
      availableTeamsForCredits,
      organizationCredits,
    };
  }

  private async checkForActiveIntegrations(organizationId: number): Promise<boolean> {
    // Simplified check - in production, you'd check for specific integrations
    // that are organization-scoped
    const hasWebhooks = await prisma.webhook.count({
      where: {
        eventTriggers: {
          isEmpty: false,
        },
        OR: [
          { teamId: organizationId },
          {
            userId: {
              in: await prisma.membership
                .findMany({
                  where: { teamId: organizationId },
                  select: { userId: true },
                })
                .then((members) => members.map((m) => m.userId)),
            },
          },
        ],
      },
    });

    return hasWebhooks > 0;
  }

  private async calculateCurrentCost(
    organization: any,
    metadata: any
  ): Promise<{ totalMonthly: number; seats: number; pricePerSeat: number }> {
    const seats = metadata.orgSeats || MINIMUM_NUMBER_OF_ORG_SEATS;
    const pricePerSeat = metadata.pricePerSeat || 0;
    const totalMonthly = seats * pricePerSeat;

    return { totalMonthly, seats, pricePerSeat };
  }

  private async calculateAfterDowngradeCost(subTeams: any[]): Promise<{
    totalMonthly: number;
    teams: Array<{
      teamId: number;
      teamName: string;
      seats: number;
      pricePerSeat: number;
      monthlyTotal: number;
    }>;
  }> {
    // This is a simplified calculation - in production, you'd fetch actual team pricing
    const DEFAULT_TEAM_PRICE_PER_SEAT = 12; // Example team-tier pricing

    const teams = subTeams.map((team) => {
      const seats = Math.max(team._count.members, 3); // Minimum 3 seats for teams
      const pricePerSeat = DEFAULT_TEAM_PRICE_PER_SEAT;
      const monthlyTotal = seats * pricePerSeat;

      return {
        teamId: team.id,
        teamName: team.name,
        seats,
        pricePerSeat,
        monthlyTotal,
      };
    });

    const totalMonthly = teams.reduce((sum, team) => sum + team.monthlyTotal, 0);

    return { totalMonthly, teams };
  }
}
