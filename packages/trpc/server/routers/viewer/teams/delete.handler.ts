import { cancelTeamSubscriptionFromStripe } from "@calcom/features/ee/teams/lib/payments";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { deleteDomain } from "@calcom/lib/domainManager/organization";
import { isTeamOwner } from "@calcom/lib/server/queries/teams";
import { closeComDeleteTeam } from "@calcom/lib/sync/SyncServiceManager";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import { deleteRemindersOfActiveOnIds } from "../workflows/util";
import type { TDeleteInputSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteOptions) => {
  if (!(await isTeamOwner(ctx.user?.id, input.teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });

  if (IS_TEAM_BILLING_ENABLED) await cancelTeamSubscriptionFromStripe(input.teamId);

  try {
    await deleteWorkflowRemindersOfRemovedTeam(input.teamId);
  } catch (e) {
    console.error(e);
  }

  const deletedTeam = await prisma.$transaction(async (tx) => {
    // delete all memberships
    await tx.membership.deleteMany({
      where: {
        teamId: input.teamId,
      },
    });

    const deletedTeam = await tx.team.delete({
      where: {
        id: input.teamId,
      },
    });
    return deletedTeam;
  });

  if (deletedTeam?.isOrganization && deletedTeam.slug) deleteDomain(deletedTeam.slug);

  // Sync Services: Close.cm
  closeComDeleteTeam(deletedTeam);
};

// cancel/delete all workflowReminders of the removed team if the realted booking doesn't belong to another active team (org teams only)
async function deleteWorkflowRemindersOfRemovedTeam(teamId: number) {
  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
    },
  });

  if (team?.parentId) {
    const activeWorkflowsOnTeam = await prisma.workflow.findMany({
      where: {
        teamId: team.parentId,
        OR: [
          {
            activeOnTeams: {
              some: {
                teamId: team.id,
              },
            },
          },
          {
            isActiveOnAll: true,
          },
        ],
      },
      select: {
        steps: true,
        activeOnTeams: true,
        isActiveOnAll: true,
      },
    });

    for (const workflow of activeWorkflowsOnTeam) {
      const workflowSteps = workflow.steps;
      let remainingActiveOnIds = [];

      if (workflow.isActiveOnAll) {
        const allRemainingOrgTeams = await prisma.team.findMany({
          where: {
            parentId: team.parentId,
            id: {
              not: team.id,
            },
          },
        });
        remainingActiveOnIds = allRemainingOrgTeams.map((team) => team.id);
      } else {
        remainingActiveOnIds = workflow.activeOnTeams
          .filter((activeOn) => activeOn.teamId !== team.id)
          .map((activeOn) => activeOn.teamId);
      }
      deleteRemindersOfActiveOnIds({
        removedActiveOnIds: [team.id],
        workflowSteps,
        isOrg: true,
        activeOnIds: remainingActiveOnIds,
      });
    }
  }
}

export default deleteHandler;
