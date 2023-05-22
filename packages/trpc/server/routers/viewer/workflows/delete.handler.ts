import { deleteScheduledEmailReminder } from "@calcom/features/ee/workflows/lib/reminders/emailReminderManager";
import { deleteScheduledSMSReminder } from "@calcom/features/ee/workflows/lib/reminders/smsReminderManager";
import { prisma } from "@calcom/prisma";
import { WorkflowMethods } from "@calcom/prisma/enums";
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
  scheduledReminders.forEach((reminder) => {
    if (reminder.method === WorkflowMethods.EMAIL) {
      deleteScheduledEmailReminder(reminder.id, reminder.referenceId);
    } else if (reminder.method === WorkflowMethods.SMS) {
      deleteScheduledSMSReminder(reminder.id, reminder.referenceId);
    }
  });

  for (const activeOn of workflowToDelete.activeOn) {
    await removeSmsReminderFieldForBooking({ workflowId: id, eventTypeId: activeOn.eventTypeId });
  }

  await prisma.workflow.deleteMany({
    where: {
      id,
    },
  });

  return {
    id,
  };
};
