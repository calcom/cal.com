import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TDeleteInputSchema } from "./delete.schema";
import { isAuthorized, removeSmsReminderFieldForBooking } from "./util";

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
    },
  });

  const isUserAuthorized = await isAuthorized(workflowToDelete, prisma, ctx.user.id, true);

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
  await deleteAllWorkflowReminders(scheduledReminders, prisma);

  for (const activeOn of workflowToDelete.activeOn) {
    await removeSmsReminderFieldForBooking({ workflowId: id, eventTypeId: activeOn.eventTypeId });
  }

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
