import { deleteScheduledEmailReminder } from "@calcom/ee/workflows/lib/reminders/emailReminderManager";
import { deleteScheduledSMSReminder } from "@calcom/ee/workflows/lib/reminders/smsReminderManager";
import { prisma } from "@calcom/prisma";
import { MembershipRole, WorkflowActions, WorkflowMethods } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TActivateEventTypeInputSchema } from "./activateEventType.schema";
import { removeSmsReminderFieldForBooking, upsertSmsReminderFieldForBooking } from "./util";

type ActivateEventTypeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TActivateEventTypeInputSchema;
};

export const activateEventTypeHandler = async ({ ctx, input }: ActivateEventTypeOptions) => {
  const { eventTypeId, workflowId } = input;

  // Check that event type belong to the user or team
  const userEventType = await prisma.eventType.findFirst({
    where: {
      id: eventTypeId,
      OR: [
        { userId: ctx.user.id },
        {
          team: {
            members: {
              some: {
                userId: ctx.user.id,
                accepted: true,
                NOT: {
                  role: MembershipRole.MEMBER,
                },
              },
            },
          },
        },
      ],
    },
  });

  if (!userEventType)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authorized to edit this event type" });

  // Check that the workflow belongs to the user or team
  const eventTypeWorkflow = await prisma.workflow.findFirst({
    where: {
      id: workflowId,
      OR: [
        {
          userId: ctx.user.id,
        },
        {
          teamId: userEventType.teamId,
        },
      ],
    },
    include: {
      steps: true,
    },
  });

  if (!eventTypeWorkflow)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authorized to enable/disable this workflow",
    });

  //check if event type is already active
  const isActive = await prisma.workflowsOnEventTypes.findFirst({
    where: {
      workflowId,
      eventTypeId,
    },
  });

  if (isActive) {
    // disable workflow for this event type & delete all reminders
    const remindersToDelete = await prisma.workflowReminder.findMany({
      where: {
        booking: {
          eventTypeId: eventTypeId,
          userId: ctx.user.id,
        },
        workflowStepId: {
          in: eventTypeWorkflow.steps.map((step) => {
            return step.id;
          }),
        },
      },
      select: {
        id: true,
        referenceId: true,
        method: true,
        scheduled: true,
      },
    });

    remindersToDelete.forEach((reminder) => {
      if (reminder.method === WorkflowMethods.EMAIL) {
        deleteScheduledEmailReminder(reminder.id, reminder.referenceId);
      } else if (reminder.method === WorkflowMethods.SMS) {
        deleteScheduledSMSReminder(reminder.id, reminder.referenceId);
      }
    });

    await prisma.workflowsOnEventTypes.deleteMany({
      where: {
        workflowId,
        eventTypeId,
      },
    });

    await removeSmsReminderFieldForBooking({
      workflowId,
      eventTypeId,
    });
  } else {
    // activate workflow and schedule reminders
    // todo

    await prisma.workflowsOnEventTypes.create({
      data: {
        workflowId,
        eventTypeId,
      },
    });

    if (
      eventTypeWorkflow.steps.some((step) => {
        return step.action === WorkflowActions.SMS_ATTENDEE;
      })
    ) {
      const isSmsReminderNumberRequired = eventTypeWorkflow.steps.some((step) => {
        return step.action === WorkflowActions.SMS_ATTENDEE && step.numberRequired;
      });
      await upsertSmsReminderFieldForBooking({
        workflowId,
        isSmsReminderNumberRequired,
        eventTypeId,
      });
    }
  }
};
