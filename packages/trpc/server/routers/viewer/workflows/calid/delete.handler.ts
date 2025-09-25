import { CalIdWorkflowRepository } from "@calcom/lib/server/repository/workflow.calid";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import { isCalIdAuthorized, removeCalIdSmsReminderFieldForEventTypes } from "../util.calid";
import type { TCalIdDeleteInputSchema } from "./delete.schema";

type CalIdDeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdDeleteInputSchema;
};

export const calIdDeleteHandler = async ({ ctx, input }: CalIdDeleteOptions) => {
  const { id } = input;

  const workflowToDelete = await prisma.calIdWorkflow.findUnique({
    where: {
      id,
    },
    include: {
      activeOn: true,
      activeOnTeams: true,
      calIdTeam: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const isUserAuthorized = await isCalIdAuthorized(workflowToDelete, ctx.user.id, true);

  if (!isUserAuthorized || !workflowToDelete) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const scheduledReminders = await prisma.calIdWorkflowReminder.findMany({
    where: {
      workflowStep: {
        workflowId: id,
      },
      scheduled: true,
      NOT: {
        referenceId: null,
      },
    },
  });

  //cancel workflow reminders of deleted workflow
  await CalIdWorkflowRepository.deleteAllWorkflowReminders(scheduledReminders);

  // For CalId teams, we only handle team-level workflows (no organization concept)
  const activeOnToRemove = workflowToDelete.calIdTeam
    ? workflowToDelete.activeOnTeams.map((activeOn) => activeOn.calIdTeamId)
    : workflowToDelete.activeOn.map((activeOn) => activeOn.eventTypeId);

  await removeCalIdSmsReminderFieldForEventTypes({
    activeOnToRemove,
    workflowId: workflowToDelete.id,
  });

  // automatically deletes all steps and reminders connected to this workflow
  await prisma.calIdWorkflow.deleteMany({
    where: {
      id,
    },
  });

  return {
    id,
  };
};
