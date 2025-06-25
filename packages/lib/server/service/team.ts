import { Prisma } from "@prisma/client";

import { TeamBilling } from "@calcom/features/ee/billing/teams";
import { deleteDomain } from "@calcom/lib/domainManager/organization";
import logger from "@calcom/lib/logger";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import { WorkflowService } from "@calcom/lib/server/service/workflows";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

export class TeamService {
  static async delete({ id }: { id: number }) {
    // 1. Handle pre-deletion business logic (e.g., workflows)
    try {
      await WorkflowService.deleteWorkflowRemindersOfRemovedTeam(id);
    } catch (e) {
      console.error(`Failed to delete workflow reminders for team ${id}`, e);
    }

    // 2. Perform the core data access operation via the repository
    const deletedTeam = await TeamRepository.deleteById({ id });

    // 3. Handle post-deletion business logic (e.g., billing, domains)
    if (deletedTeam) {
      const teamBilling = await TeamBilling.findAndInit(id);
      await teamBilling.cancel();

      if (deletedTeam.isOrganization && deletedTeam.slug) {
        deleteDomain(deletedTeam.slug);
      }
    }

    return deletedTeam;
  }

  static async removeMembers(teamIds: number[], memberIds: number[], isOrg = false) {
    const deleteMembershipPromises = [];

    for (const memberId of memberIds) {
      for (const teamId of teamIds) {
        deleteMembershipPromises.push(
          this.removeMember({
            teamId,
            memberId,
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

  static async removeMember({
    memberId,
    teamId,
    isOrg,
  }: {
    memberId: number;
    teamId: number;
    isOrg: boolean;
  }) {
    const log = logger.getSubLogger({ prefix: ["removeMember"] });
    const [membership] = await prisma.$transaction([
      prisma.membership.delete({
        where: {
          userId_teamId: { userId: memberId, teamId: teamId },
        },
        include: {
          user: true,
          team: true,
        },
      }),
      // remove user as host from team events associated with this membership
      prisma.host.deleteMany({
        where: {
          userId: memberId,
          eventType: {
            teamId: teamId,
          },
        },
      }),
    ]);

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

    const foundUser = await prisma.user.findUnique({
      where: { id: memberId },
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

    if (!team || !foundUser) throw new TRPCError({ code: "NOT_FOUND" });

    if (isOrg) {
      log.debug("Removing a member from the organization");
      // Deleting membership from all child teams
      await prisma.membership.deleteMany({
        where: {
          team: {
            parentId: teamId,
          },
          userId: membership.userId,
        },
      });

      const profileToDelete = await ProfileRepository.findByUserIdAndOrgId({
        userId: foundUser.id,
        organizationId: team.id,
      });

      if (foundUser.username && foundUser.movedToProfileId === profileToDelete?.id) {
        log.debug("Cleaning up tempOrgRedirect for user", foundUser.username);
        await prisma.tempOrgRedirect.deleteMany({
          where: {
            from: foundUser.username,
          },
        });
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: membership.userId },
          data: { organizationId: null },
        }),
        ProfileRepository.delete({
          userId: membership.userId,
          organizationId: team.id,
        }),
        prisma.host.deleteMany({
          where: {
            userId: memberId,
            eventType: {
              team: {
                parentId: teamId,
              },
            },
          },
        }),
      ]);
    }

    // Deleted managed event types from this team from this member
    await prisma.eventType.deleteMany({
      where: { parent: { teamId: teamId }, userId: membership.userId },
    });

    if (team) {
      await WorkflowService.deleteWorkfowRemindersOfRemovedMember(team, memberId, isOrg);
    }

    return { membership };
  }

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
}
