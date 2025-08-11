import { Prisma } from "@prisma/client";

import { TeamBilling } from "@calcom/features/ee/billing/teams";
import removeMember from "@calcom/features/ee/teams/lib/removeMember";
import { deleteDomain } from "@calcom/lib/domainManager/organization";
import logger from "@calcom/lib/logger";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import { WorkflowService } from "@calcom/lib/server/service/workflows";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

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

  static async removeMembers(teamIds: number[], memberIds: number[], isOrg = false) {
    const deleteMembershipPromises = [];

    for (const memberId of memberIds) {
      for (const teamId of teamIds) {
        deleteMembershipPromises.push(
          removeMember({
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
}
