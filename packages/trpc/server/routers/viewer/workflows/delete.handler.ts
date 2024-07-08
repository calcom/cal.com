import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TDeleteInputSchema } from "./delete.schema";
import { deleteAllWorkflowReminders, isAuthorized, removeSmsReminderFieldForEventTypes } from "./util";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteOptions) => {
  const { id } = input;

  const workflowToDelete = await prisma.workflow.findFirst({
    where: {
      id,
    },
    include: {
      activeOn: true,
      activeOnTeams: true,
      team: {
        select: {
          isOrganization: true,
        },
      },
    },
  });

  const isUserAuthorized = await isAuthorized(workflowToDelete, ctx.user.id, true);

  if (!isUserAuthorized || !workflowToDelete) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const scheduledReminders = await prisma.workflowReminder.findMany({
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
  await deleteAllWorkflowReminders(scheduledReminders);

  const isOrg = workflowToDelete.team?.isOrganization ?? false;

  const activeOnToRemove = isOrg
    ? workflowToDelete.activeOnTeams.map((activeOn) => activeOn.teamId)
    : workflowToDelete.activeOn.map((activeOn) => activeOn.eventTypeId);

  await removeSmsReminderFieldForEventTypes({ activeOnToRemove, workflowId: workflowToDelete.id, isOrg });

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
