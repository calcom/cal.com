import { Prisma } from "@prisma/client";

import { TeamBilling } from "@calcom/features/ee/billing/teams";
import { deleteWorkfowRemindersOfRemovedMember } from "@calcom/features/ee/teams/lib/deleteWorkflowRemindersOfRemovedMember";
import { deleteDomain } from "@calcom/lib/domainManager/organization";
import logger from "@calcom/lib/logger";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import { WorkflowService } from "@calcom/lib/server/service/workflows";
import prisma from "@calcom/prisma";
import type { Membership } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

const log = logger.getSubLogger({ prefix: ["TeamService"] });

type MembershipWithRelations = Pick<
  Membership,
  "id" | "userId" | "teamId" | "role" | "accepted" | "disableImpersonation"
>;

type TeamWithSettings = {
  id: number;
  isOrganization: boolean | null;
  organizationSettings: unknown;
  metadata: unknown;
  activeOrgWorkflows: unknown;
  parentId: number | null;
};

type UserWithTeams = {
  id: number;
  movedToProfileId: number | null;
  email: string;
  username: string | null;
  completedOnboarding: boolean;
  teams: {
    team: {
      id: number;
      parentId: number | null;
    };
  }[];
};

export type RemoveMemberResult = {
  membership: MembershipWithRelations;
};

export class TeamService {
  /**
   * Deletes a team and all its associated data in a safe, transactional order.
   * External, critical services like billing are handled first to prevent data inconsistencies.
   */
  static async delete({ id }: { id: number }) {
    // Step 1: Cancel the external billing subscription first.
    // If this fails, the entire operation aborts, leaving the team and its data intact.
    // This prevents a state where the user is billed for a deleted team.
    const teamBilling = await TeamBilling.findAndInit(id);
    await teamBilling.cancel();

    // Step 2: Clean up internal, related data like workflow reminders.
    try {
      await WorkflowService.deleteWorkflowRemindersOfRemovedTeam(id);
    } catch (e) {
      // Log the error, but don't abort the deletion.
      // It's better to have a deleted team with orphaned reminders than to halt the process
      // after the subscription has already been canceled.
      logger.error(`Failed to delete workflow reminders for team ${id}`, e);
    }

    // Step 3: Delete the team from the database. This is the core "commit" point.
    const teamRepo = new TeamRepository(prisma);
    const deletedTeam = await teamRepo.deleteById({ id });

    // Step 4: Clean up any final, non-critical external state.
    if (deletedTeam && deletedTeam.isOrganization && deletedTeam.slug) {
      deleteDomain(deletedTeam.slug);
    }

    return deletedTeam;
  }

  static async removeMembers({
    teamIds,
    userIds,
    isOrg = false,
  }: {
    teamIds: number[];
    userIds: number[];
    isOrg?: boolean;
  }) {
    const deleteMembershipPromises: Promise<RemoveMemberResult>[] = [];

    for (const userId of userIds) {
      for (const teamId of teamIds) {
        deleteMembershipPromises.push(
          TeamService.removeMember({
            teamId,
            userId,
            isOrg,
          })
        );
      }
    }

    await Promise.all(deleteMembershipPromises);

    const teamsBilling = await TeamBilling.findAndInitMany(teamIds);
    const teamBillingPromises = teamsBilling.map((teamBilling) => teamBilling.updateQuantity());
    await Promise.allSettled(teamBillingPromises);
  }

  // TODO: Move errors away from TRPC error to make it more generic
  static async inviteMemberByToken(token: string, userId: number) {
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        OR: [{ expiresInDays: null }, { expires: { gte: new Date() } }],
      },
      include: {
        team: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!verificationToken) throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
    if (!verificationToken.teamId || !verificationToken.team)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invite token is not associated with any team",
      });

    try {
      await prisma.membership.create({
        data: {
          createdAt: new Date(),
          teamId: verificationToken.teamId,
          userId: userId,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This user is a member of this team / has a pending invitation.",
          });
        }
      } else throw e;
    }

    const teamBilling = await TeamBilling.findAndInit(verificationToken.teamId);
    await teamBilling.updateQuantity();

    return verificationToken.team.name;
  }

  static async publish(teamId: number) {
    const teamBilling = await TeamBilling.findAndInit(teamId);
    return teamBilling.publish();
  }

  private static async removeMember({
    userId,
    teamId,
    isOrg,
  }: {
    userId: number;
    teamId: number;
    isOrg: boolean;
  }) {
    const membership = await TeamService.fetchMembershipOrThrow(userId, teamId);
    const team = await TeamService.fetchTeamOrThrow(teamId);
    const user = await TeamService.fetchUserOrThrow(userId);

    if (isOrg) {
      log.debug("Removing a member from the organization");
      await TeamService.removeFromOrganization(membership, team, user);
    } else {
      log.debug("Removing a member from a team");
      await TeamService.removeFromTeam(membership, teamId);
    }

    await deleteWorkfowRemindersOfRemovedMember(team, userId, isOrg);

    return { membership };
  }

  // TODO: Needs to be moved to repository
  private static async fetchMembershipOrThrow(
    userId: number,
    teamId: number
  ): Promise<MembershipWithRelations> {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_teamId: { userId: userId, teamId: teamId },
      },
      select: {
        id: true,
        userId: true,
        teamId: true,
        role: true,
        accepted: true,
        disableImpersonation: true,
      },
    });

    if (!membership) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Membership not found" });
    }

    return membership;
  }

  // TODO: Needs to be moved to repository
  private static async fetchTeamOrThrow(teamId: number): Promise<TeamWithSettings> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        isOrganization: true,
        organizationSettings: true,
        id: true,
        metadata: true,
        activeOrgWorkflows: true,
        parentId: true,
      },
    });

    if (!team) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
    }

    return team;
  }

  // TODO: Needs to be moved to repository
  private static async fetchUserOrThrow(userId: number): Promise<UserWithTeams> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        movedToProfileId: true,
        email: true,
        username: true,
        completedOnboarding: true,
        teams: {
          select: {
            team: {
              select: {
                id: true,
                parentId: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return user;
  }

  // TODO: Needs to be moved to repository
  private static async cleanupTempOrgRedirect(user: UserWithTeams, team: TeamWithSettings) {
    const profileToDelete = await ProfileRepository.findByUserIdAndOrgId({
      userId: user.id,
      organizationId: team.id,
    });

    if (user.username && user.movedToProfileId === profileToDelete?.id) {
      log.debug("Cleaning up tempOrgRedirect for user", user.username);
      await prisma.tempOrgRedirect.deleteMany({
        where: {
          from: user.username,
        },
      });
    }
  }

  private static async removeFromOrganization(
    membership: MembershipWithRelations,
    team: TeamWithSettings,
    user: UserWithTeams
  ) {
    await TeamService.cleanupTempOrgRedirect(user, team);
    const newUsername = generateNewUsername(user);

    await prisma.$transaction([
      // Remove user from all sub-teams event type hosts
      prisma.host.deleteMany({
        where: {
          userId: membership.userId,
          eventType: {
            team: {
              parentId: team.id,
            },
          },
        },
      }),
      // Delete managed child events in sub-teams
      prisma.eventType.deleteMany({
        where: {
          userId: membership.userId,
          parent: {
            team: {
              parentId: team.id,
            },
          },
        },
      }),
      // Remove organizationId from the user
      prisma.user.update({
        where: { id: membership.userId },
        data: {
          organizationId: null,
          username: newUsername,
        },
      }),
      // Delete the profile of the user from the organization
      ProfileRepository.delete({
        userId: membership.userId,
        organizationId: team.id,
      }),
      // Delete all sub-team memberships where this team is the organization
      prisma.membership.deleteMany({
        where: {
          team: {
            parentId: team.id,
          },
          userId: membership.userId,
        },
      }),
      // Delete the membership of the user from the organization
      prisma.membership.delete({
        where: {
          userId_teamId: { userId: membership.userId, teamId: team.id },
        },
      }),
    ]);

    // Generate new username for user leaving organization
    function generateNewUsername(user: UserWithTeams): string | null {
      // We ensure that new username would be unique across all users in the global namespace outside any organization
      return user.username != null ? `${user.username}-${user.id}` : null;
    }
  }

  // Remove member from regular team
  private static async removeFromTeam(membership: MembershipWithRelations, teamId: number) {
    await prisma.$transaction([
      // Remove user from all team event types' hosts
      prisma.host.deleteMany({
        where: {
          userId: membership.userId,
          eventType: {
            teamId: teamId,
          },
        },
      }),
      // Deleted managed event types from this team for this member
      prisma.eventType.deleteMany({
        where: { parent: { teamId: teamId }, userId: membership.userId },
      }),
      // Delete the membership of the user from the team
      prisma.membership.delete({
        where: {
          userId_teamId: { userId: membership.userId, teamId: teamId },
        },
      }),
    ]);
  }
}
