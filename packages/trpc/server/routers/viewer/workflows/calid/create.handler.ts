import emailReminderTemplate from "@calid/features/modules/workflows/templates/email/reminder";
import type { CalIdWorkflow } from "@prisma/client";

import { SENDER_NAME } from "@calcom/lib/constants";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import type { PrismaClient } from "@calcom/prisma";
import { prisma } from "@calcom/prisma";
import {
  CalIdMembershipRole,
  TimeUnit,
  WorkflowActions,
  WorkflowTemplates,
  WorkflowTriggerEvents,
} from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TCalIdCreateInputSchema } from "./create.schema";

type CalIdCreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TCalIdCreateInputSchema;
};

export const calIdCreateHandler = async ({ ctx, input }: CalIdCreateOptions) => {
  const { calIdTeamId } = input;

  const userId = ctx.user.id;

  if (calIdTeamId) {
    const calIdTeam = await prisma.calIdTeam.findFirst({
      where: {
        id: calIdTeamId,
        members: {
          some: {
            userId: ctx.user.id,
            acceptedInvitation: true,
            NOT: {
              role: CalIdMembershipRole.MEMBER,
            },
          },
        },
      },
    });

    if (!calIdTeam) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
      });
    }
  }

  try {
    const workflow: CalIdWorkflow = await prisma.calIdWorkflow.create({
      data: {
        name: "",
        trigger: WorkflowTriggerEvents.BEFORE_EVENT,
        time: 24,
        timeUnit: TimeUnit.HOUR,
        userId,
        calIdTeamId,
      },
    });

    const renderedEmailTemplate = emailReminderTemplate({
      isEditingMode: true,
      locale: ctx.user.locale,
      action: WorkflowActions.EMAIL_ATTENDEE,
      timeFormat: getTimeFormatStringFromUserTimeFormat(ctx.user.timeFormat),
    });
    await ctx.prisma.calIdWorkflowStep.create({
      data: {
        stepNumber: 1,
        action: WorkflowActions.EMAIL_ATTENDEE,
        template: WorkflowTemplates.REMINDER,
        reminderBody: renderedEmailTemplate.emailBody,
        emailSubject: renderedEmailTemplate.emailSubject,
        workflowId: workflow.id,
        sender: SENDER_NAME,
        numberVerificationPending: false,
      },
    });
    return { workflow };
  } catch (e) {
    throw e;
  }
};
