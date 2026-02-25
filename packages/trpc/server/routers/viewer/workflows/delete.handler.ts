import { isAuthorized } from "@calcom/features/ee/workflows/lib/isAuthorized";
import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TDeleteInputSchema } from "./delete.schema";
import { removeSmsReminderFieldForEventTypes, removeAIAgentCallPhoneNumberFieldForEventTypes } from "./util";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteOptions) => {
  const { id } = input;
  const log = logger.getSubLogger({ prefix: ["workflows/deleteHandler"] });

  const workflowToDelete = await prisma.workflow.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      teamId: true,
      userId: true,
      activeOn: {
        select: {
          eventTypeId: true,
        },
      },
      activeOnTeams: {
        select: {
          teamId: true,
        },
      },
      steps: {
        select: {
          action: true,
        },
      },
      team: {
        select: {
          isOrganization: true,
        },
      },
    },
  });

  const isUserAuthorized = await isAuthorized(workflowToDelete, ctx.user.id, "workflow.delete");

  if (!isUserAuthorized || !workflowToDelete) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const scheduledReminders = await prisma.workflowReminder.findMany({
    where: {
      workflowStep: {
        workflowId: id,
      },
    },
  });

  //cancel workflow reminders of deleted workflow
  await WorkflowRepository.deleteAllWorkflowReminders(scheduledReminders);

  const isOrg = workflowToDelete.team?.isOrganization ?? false;

  const activeOnToRemove = isOrg
    ? workflowToDelete.activeOnTeams.map((activeOn) => activeOn.teamId)
    : workflowToDelete.activeOn.map((activeOn) => activeOn.eventTypeId);

  await removeSmsReminderFieldForEventTypes({ activeOnToRemove, workflowId: workflowToDelete.id, isOrg });
  await removeAIAgentCallPhoneNumberFieldForEventTypes({
    activeOnToRemove,
    workflowId: workflowToDelete.id,
    isOrg,
  });

  // automatically deletes all steps and reminders connected to this workflow
  await prisma.workflow.deleteMany({
    where: {
      id,
    },
  });

  return {
    id,
  };
};
