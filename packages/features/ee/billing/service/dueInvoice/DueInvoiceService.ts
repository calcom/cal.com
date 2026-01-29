import type { PrismaClient } from "@calcom/prisma";
import { prisma as defaultPrisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TeamRepository } from "../../../teams/repositories/TeamRepository";

export interface CanInviteResult {
  allowed: boolean;
  reason?: string;
}

export interface BannerData {
  teamId: number;
  teamName: string;
  isOrganization: boolean;
  amountDue: number;
  isBlocking: boolean;
  prorationId: string;
  monthKey: string;
  invoiceUrl: string | null;
}

const BLOCKING_THRESHOLD_DAYS = 7;

export class DueInvoiceService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || defaultPrisma;
  }

  /**
   * Check if a team has a blocking (7+ days overdue) proration invoice
   */
  async hasBlockingProration(teamId: number): Promise<boolean> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - BLOCKING_THRESHOLD_DAYS);

    const blockingProration = await this.prisma.monthlyProration.findFirst({
      where: {
        teamId,
        status: {
          in: ["FAILED", "INVOICE_CREATED"],
        },
        createdAt: {
          lte: sevenDaysAgo,
        },
      },
      select: { id: true },
    });

    return blockingProration !== null;
  }

  /**
   * Check if invitations can be sent for a team
   * Sub-team exception: Allow inviting existing org members to sub-teams even with blocking prorations
   */
  async canInviteToTeam({
    teamId,
    inviteeEmails,
    isSubTeam,
    parentOrgId,
  }: {
    teamId: number;
    inviteeEmails: string[];
    isSubTeam: boolean;
    parentOrgId: number | null;
  }): Promise<CanInviteResult> {
    // Determine which team to check for billing (org or team itself)
    const billingTeamId = parentOrgId ?? teamId;
    const hasBlocking = await this.hasBlockingProration(billingTeamId);

    if (!hasBlocking) {
      return { allowed: true };
    }

    // Sub-team exception: allow if all invitees are already org members
    if (isSubTeam && parentOrgId) {
      const allAreOrgMembers = await this.checkAllInviteesAreOrgMembers(inviteeEmails, parentOrgId);
      if (allAreOrgMembers) {
        return { allowed: true };
      }
    }

    return { allowed: false, reason: "invitations_blocked_unpaid_invoice" };
  }

  /**
   * Check if all invitees are already members of the organization
   */
  private async checkAllInviteesAreOrgMembers(emails: string[], orgId: number): Promise<boolean> {
    if (emails.length === 0) {
      return true;
    }

    // Find users by email who are members of the org
    const orgMembers = await this.prisma.membership.findMany({
      where: {
        teamId: orgId,
        accepted: true,
        user: {
          email: {
            in: emails,
          },
        },
      },
      select: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    const memberEmails = new Set(orgMembers.map((m) => m.user.email.toLowerCase()));
    return emails.every((email) => memberEmails.has(email.toLowerCase()));
  }

  /**
   * Get banner data for a user - returns overdue prorations for teams where user has billing permission
   */
  async getBannerDataForUser(userId: number): Promise<BannerData[]> {
    const teamRepository = new TeamRepository(this.prisma);

    // Get teams where user has billing permission (ADMIN/OWNER or specific permission)
    const teamsWithBillingPermission = await this.findTeamsWithBillingPermission(userId, teamRepository);

    if (teamsWithBillingPermission.length === 0) {
      return [];
    }

    const teamIds = teamsWithBillingPermission.map((t) => t.id);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - BLOCKING_THRESHOLD_DAYS);

    // Get overdue prorations for these teams
    const overdueProrations = await this.prisma.monthlyProration.findMany({
      where: {
        teamId: { in: teamIds },
        status: {
          in: ["FAILED", "INVOICE_CREATED"],
        },
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            isOrganization: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return overdueProrations.map((proration) => ({
      teamId: proration.teamId,
      teamName: proration.team.name,
      isOrganization: proration.team.isOrganization,
      amountDue: proration.proratedAmount,
      isBlocking: proration.createdAt <= sevenDaysAgo,
      prorationId: proration.id,
      monthKey: proration.monthKey,
      invoiceUrl: proration.invoiceUrl,
    }));
  }

  /**
   * Find teams where user has billing management permission
   */
  private async findTeamsWithBillingPermission(
    userId: number,
    teamRepository: TeamRepository
  ): Promise<{ id: number; isOrganization: boolean }[]> {
    // Get all teams/orgs where user is ADMIN or OWNER
    const memberships = await this.prisma.membership.findMany({
      where: {
        userId,
        accepted: true,
        role: {
          in: [MembershipRole.ADMIN, MembershipRole.OWNER],
        },
      },
      select: {
        teamId: true,
        team: {
          select: {
            id: true,
            isOrganization: true,
          },
        },
      },
    });

    // For each team, check if user has billing permission using PBAC or legacy role
    const teamsWithPermission: { id: number; isOrganization: boolean }[] = [];

    for (const membership of memberships) {
      const permission = membership.team.isOrganization ? "organization.manageBilling" : "team.manageBilling";

      try {
        const usersWithPermission = await teamRepository.findTeamMembersWithPermission({
          teamId: membership.teamId,
          permission,
          fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        });

        const hasPermission = usersWithPermission.some((u) => u.id === userId);
        if (hasPermission) {
          teamsWithPermission.push({
            id: membership.team.id,
            isOrganization: membership.team.isOrganization,
          });
        }
      } catch {
        // If permission check fails, fall back to role-based check (already filtered above)
        teamsWithPermission.push({
          id: membership.team.id,
          isOrganization: membership.team.isOrganization,
        });
      }
    }

    return teamsWithPermission;
  }
}
