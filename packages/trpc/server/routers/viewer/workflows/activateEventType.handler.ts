import { prisma } from "@calcom/prisma";
import { MembershipRole, WorkflowActions } from "@calcom/prisma/enums";
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
    include: {
      children: true,
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
    await prisma.workflowsOnEventTypes.deleteMany({
      where: {
        workflowId,
        eventTypeId: userEventType.children.length
          ? { in: [eventTypeId].concat(userEventType.children.map((ch) => ch.id)) }
          : eventTypeId,
      },
    });

    await removeSmsReminderFieldForBooking({
      workflowId,
      eventTypeId,
    });
  } else {
    await prisma.workflowsOnEventTypes.createMany({
      data: [
        {
          workflowId,
          eventTypeId,
        },
      ].concat(userEventType.children.map((ch) => ({ workflowId, eventTypeId: ch.id }))),
    });

    if (
      eventTypeWorkflow.steps.some((step) => {
        return step.action === WorkflowActions.SMS_ATTENDEE;
      })
    ) {
      const isSmsReminderNumberRequired = eventTypeWorkflow.steps.some((step) => {
        return step.action === WorkflowActions.SMS_ATTENDEE && step.numberRequired;
      });
      [eventTypeId].concat(userEventType.children.map((ch) => ch.id)).map(async (evTyId) => {
        await upsertSmsReminderFieldForBooking({
          workflowId,
          isSmsReminderNumberRequired,
          eventTypeId: evTyId,
        });
      });
    }
  }
};
