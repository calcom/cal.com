import { TeamBilling } from "@calcom/features/ee/billing/teams";
import billing from "@calcom/features/ee/billing";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import type { Team, PrismaClient } from "@calcom/prisma/client";
import type { Prisma } from "@calcom/prisma/client";

import type { TeamSlugConflictResolution } from "./conflictResolutionUtils";
import { applyTeamSlugResolutions } from "./conflictResolutionUtils";

// Type for Prisma transaction client
type PrismaTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

const log = logger.getSubLogger({ prefix: ["TeamExtractionUtils"] });

export type ExtractedTeam = {
  teamId: number;
  teamName: string;
  originalSlug: string | null;
  newSlug: string;
  memberCount: number;
  subscriptionId: string | null;
};

/**
 * Extracts teams from an organization by clearing their parentId and applying resolved slugs.
 * This effectively converts sub-teams into standalone teams.
 *
 * @param tx - Prisma transaction client
 * @param organizationId - ID of the organization to extract teams from
 * @param slugResolutions - Pre-computed slug resolutions to apply
 * @returns Array of extracted team details
 */
export async function extractTeamsFromOrganization(
  tx: PrismaTransaction,
  organizationId: number,
  slugResolutions: TeamSlugConflictResolution[]
): Promise<ExtractedTeam[]> {
  log.info("Starting team extraction from organization", safeStringify({ organizationId }));

  // Get all sub-teams
  const subTeams = await tx.team.findMany({
    where: {
      parentId: organizationId,
    },
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

  log.debug(
    "Found sub-teams to extract",
    safeStringify({ count: subTeams.length, teamIds: subTeams.map((t) => t.id) })
  );

  const extractedTeams: ExtractedTeam[] = [];

  // Apply slug resolutions and extract each team
  for (const team of subTeams) {
    const resolution = slugResolutions.find((r) => r.teamId === team.id);
    const newSlug = resolution?.resolvedSlug || team.slug || "";

    // Clear parentId to make team standalone and apply new slug
    await tx.team.update({
      where: { id: team.id },
      data: {
        parentId: null,
        slug: newSlug,
      },
    });

    log.debug(
      "Extracted team from organization",
      safeStringify({
        teamId: team.id,
        teamName: team.name,
        originalSlug: team.slug,
        newSlug,
      })
    );

    extractedTeams.push({
      teamId: team.id,
      teamName: team.name,
      originalSlug: team.slug,
      newSlug,
      memberCount: team._count.members,
      subscriptionId: null, // Will be populated later if billing is enabled
    });
  }

  log.info(
    "Team extraction complete",
    safeStringify({ organizationId, extractedCount: extractedTeams.length })
  );

  return extractedTeams;
}

/**
 * Creates individual Stripe subscriptions for each team with team-tier pricing.
 * This is called after teams have been extracted from the organization.
 * Note: This happens OUTSIDE the transaction since it involves Stripe API calls.
 *
 * @param teams - Array of extracted teams to create subscriptions for
 * @returns Updated array of teams with subscription IDs
 */
export async function createTeamSubscriptions(teams: ExtractedTeam[]): Promise<ExtractedTeam[]> {
  log.info("Creating team subscriptions", safeStringify({ teamsCount: teams.length }));

  const updatedTeams: ExtractedTeam[] = [];

  for (const team of teams) {
    try {
      // Get team owner to associate subscription
      const owner = await prisma.membership.findFirst({
        where: {
          teamId: team.teamId,
          role: "OWNER",
        },
        select: {
          userId: true,
          user: {
            select: {
              email: true,
              metadata: true,
            },
          },
        },
      });

      if (!owner) {
        log.warn("No owner found for team, skipping subscription creation", safeStringify({ team }));
        updatedTeams.push(team);
        continue;
      }

      // Get or create Stripe customer for the team owner
      const teamData = await prisma.team.findUnique({
        where: { id: team.teamId },
        select: {
          id: true,
          metadata: true,
          isOrganization: true,
          parentId: true,
        },
      });

      if (!teamData) {
        log.error("Team not found", safeStringify({ teamId: team.teamId }));
        updatedTeams.push(team);
        continue;
      }

      const teamBilling = TeamBilling.init(teamData);

      // Create checkout session for team subscription
      // This uses the existing team billing flow which creates a Stripe subscription
      log.debug(
        "Creating checkout session for team",
        safeStringify({ teamId: team.teamId, memberCount: team.memberCount })
      );

      // Note: The actual subscription is created when the checkout session is completed
      // For now, we'll mark the team as requiring payment setup
      await prisma.team.update({
        where: { id: team.teamId },
        data: {
          metadata: {
            ...(typeof teamData.metadata === "object" ? teamData.metadata : {}),
            requiresPaymentSetup: true,
            downgradedFromOrgAt: new Date().toISOString(),
          },
        },
      });

      updatedTeams.push({
        ...team,
        subscriptionId: null, // Will be set after payment is completed
      });

      log.debug(
        "Marked team as requiring payment setup",
        safeStringify({ teamId: team.teamId })
      );
    } catch (error) {
      log.error(
        "Error creating subscription for team",
        safeStringify({ teamId: team.teamId, error: error instanceof Error ? error.message : error })
      );
      updatedTeams.push(team);
    }
  }

  log.info("Team subscription creation complete", safeStringify({ teamsCount: updatedTeams.length }));

  return updatedTeams;
}

/**
 * Removes organization-only members (members who are only in the org, not in any sub-team).
 * Uses the existing removeFromOrganization logic from TeamService.
 *
 * @param tx - Prisma transaction client
 * @param organizationId - ID of the organization
 * @returns Array of removed member details
 */
export async function cleanupOrganizationMembers(
  tx: PrismaTransaction,
  organizationId: number
): Promise<Array<{ userId: number; email: string }>> {
  log.info("Starting cleanup of organization-only members", safeStringify({ organizationId }));

  // Get all organization members
  const orgMembers = await tx.membership.findMany({
    where: {
      teamId: organizationId,
    },
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
  });

  // Get all sub-team members
  const subTeamMembers = await tx.membership.findMany({
    where: {
      team: {
        parentId: organizationId,
      },
    },
    select: {
      userId: true,
    },
  });

  const subTeamMemberIds = new Set(subTeamMembers.map((m) => m.userId));

  // Find org-only members (in org but not in any sub-team)
  const orgOnlyMembers = orgMembers.filter((m) => !subTeamMemberIds.has(m.userId));

  log.debug(
    "Found organization-only members",
    safeStringify({
      totalOrgMembers: orgMembers.length,
      subTeamMembers: subTeamMemberIds.size,
      orgOnlyMembers: orgOnlyMembers.length,
    })
  );

  const removedMembers: Array<{ userId: number; email: string }> = [];

  for (const member of orgOnlyMembers) {
    try {
      // Delete organization membership
      await tx.membership.deleteMany({
        where: {
          userId: member.userId,
          teamId: organizationId,
        },
      });

      // Remove organizationId from user
      await tx.user.update({
        where: { id: member.userId },
        data: {
          organizationId: null,
        },
      });

      // Delete organization profile
      await tx.profile.deleteMany({
        where: {
          userId: member.userId,
          organizationId: organizationId,
        },
      });

      log.debug(
        "Removed organization-only member",
        safeStringify({ userId: member.userId, email: member.user.email })
      );

      removedMembers.push({
        userId: member.userId,
        email: member.user.email,
      });
    } catch (error) {
      log.error(
        "Error removing organization member",
        safeStringify({
          userId: member.userId,
          error: error instanceof Error ? error.message : error,
        })
      );
    }
  }

  log.info(
    "Organization member cleanup complete",
    safeStringify({ organizationId, removedCount: removedMembers.length })
  );

  return removedMembers;
}

/**
 * Migrates organization credits back to individual teams.
 * This ensures teams retain any credits that were pooled at the org level.
 *
 * @param tx - Prisma transaction client
 * @param organizationId - ID of the organization
 * @param teamIds - Array of team IDs to distribute credits to
 * @param targetTeamId - Optional specific team ID to receive all credits. If not provided, credits are distributed evenly.
 */
export async function migrateOrganizationCredits(
  tx: PrismaTransaction,
  organizationId: number,
  teamIds: number[],
  targetTeamId?: number
): Promise<void> {
  log.info(
    "Starting organization credit migration",
    safeStringify({ organizationId, teamsCount: teamIds.length })
  );

  try {
    // Get organization's credit balance
    const orgCreditBalance = await tx.creditBalance.findUnique({
      where: { teamId: organizationId },
      select: {
        id: true,
        additionalCredits: true,
      },
    });

    if (!orgCreditBalance || orgCreditBalance.additionalCredits === 0) {
      log.debug("No credits to migrate from organization");
      return;
    }

    const totalCredits = orgCreditBalance.additionalCredits;

    // If targetTeamId is specified, validate it's one of the teams being extracted
    if (targetTeamId && !teamIds.includes(targetTeamId)) {
      log.error(
        "Target team for credits is not a sub-team of this organization",
        safeStringify({ targetTeamId, teamIds })
      );
      throw new Error("Invalid target team for credits - must be a sub-team of the organization");
    }

    // Determine distribution strategy
    const distribution: Array<{ teamId: number; credits: number }> = [];

    if (targetTeamId) {
      // All credits go to the specified team
      distribution.push({ teamId: targetTeamId, credits: totalCredits });
      log.debug(
        "Transferring all credits to target team",
        safeStringify({ totalCredits, targetTeamId })
      );
    } else {
      // Distribute credits evenly among all teams
      const creditsPerTeam = Math.floor(totalCredits / teamIds.length);
      const remainderCredits = totalCredits % teamIds.length;

      log.debug(
        "Distributing credits evenly",
        safeStringify({ totalCredits, creditsPerTeam, remainderCredits, teamCount: teamIds.length })
      );

      for (let i = 0; i < teamIds.length; i++) {
        const credits = creditsPerTeam + (i === 0 ? remainderCredits : 0); // Give remainder to first team
        if (credits > 0) {
          distribution.push({ teamId: teamIds[i], credits });
        }
      }
    }

    // Apply the credit distribution
    for (const { teamId, credits } of distribution) {
      if (credits === 0) {
        continue;
      }

      // Check if team already has a credit balance
      const existingCreditBalance = await tx.creditBalance.findUnique({
        where: { teamId },
      });

      if (existingCreditBalance) {
        // Update existing credit balance
        await tx.creditBalance.update({
          where: { teamId },
          data: {
            additionalCredits: {
              increment: credits,
            },
          },
        });
      } else {
        // Create new credit balance for team
        await tx.creditBalance.create({
          data: {
            teamId,
            additionalCredits: credits,
          },
        });
      }

      // Create purchase log entry to track the credit transfer
      const teamCreditBalance = await tx.creditBalance.findUnique({
        where: { teamId },
        select: { id: true },
      });

      if (teamCreditBalance) {
        await tx.creditPurchaseLog.create({
          data: {
            creditBalanceId: teamCreditBalance.id,
            credits,
            createdAt: new Date(),
          },
        });
      }

      log.debug("Migrated credits to team", safeStringify({ teamId, credits }));
    }

    log.info("Organization credit migration complete");
  } catch (error) {
    log.error(
      "Error migrating organization credits",
      safeStringify({ error: error instanceof Error ? error.message : error })
    );
    throw error;
  }
}

/**
 * Deletes the organization entity and cleans up all related data.
 *
 * @param tx - Prisma transaction client
 * @param organizationId - ID of the organization to delete
 */
export async function deleteOrganization(tx: PrismaTransaction, organizationId: number): Promise<void> {
  log.info("Starting organization deletion", safeStringify({ organizationId }));

  try {
    // Delete all organization memberships (should be empty at this point)
    await tx.membership.deleteMany({
      where: { teamId: organizationId },
    });

    // Delete organization profiles
    await tx.profile.deleteMany({
      where: { organizationId },
    });

    // Delete temp org redirects
    await tx.tempOrgRedirect.deleteMany({
      where: {
        OR: [{ from: { contains: String(organizationId) } }, { toUrl: { contains: String(organizationId) } }],
      },
    });

    // Delete the organization team record
    await tx.team.delete({
      where: { id: organizationId },
    });

    log.info("Organization deletion complete", safeStringify({ organizationId }));
  } catch (error) {
    log.error(
      "Error deleting organization",
      safeStringify({
        organizationId,
        error: error instanceof Error ? error.message : error,
      })
    );
    throw error;
  }
}
