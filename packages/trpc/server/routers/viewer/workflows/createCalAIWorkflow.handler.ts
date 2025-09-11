import type { Workflow } from "@prisma/client";

import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { SENDER_NAME } from "@calcom/lib/constants";
import type { PrismaClient } from "@calcom/prisma";
import { prisma } from "@calcom/prisma";
import {
  MembershipRole,
  TimeUnit,
  WorkflowActions,
  WorkflowTemplates,
  WorkflowTriggerEvents,
} from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TCreateCalAIWorkflowInputSchema } from "./createCalAIWorkflow.schema";

type CreateCalAIWorkflowOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TCreateCalAIWorkflowInputSchema;
};

const WORKFLOW_TEMPLATES = {
  "wf-10": {
    name: "Cal AI No-show Follow-up Call",
    trigger: WorkflowTriggerEvents.BOOKING_NO_SHOW_UPDATED,
    time: 0,
    timeUnit: TimeUnit.MINUTE,
  },
  "wf-11": {
    name: "Cal AI 1-hour Meeting Reminder",
    trigger: WorkflowTriggerEvents.BEFORE_EVENT,
    time: 1,
    timeUnit: TimeUnit.HOUR,
  },
} as const;

export const createCalAIWorkflowHandler = async ({ ctx, input }: CreateCalAIWorkflowOptions) => {
  const { templateId, teamId, name } = input;
  const userId = ctx.user.id;

  if (teamId) {
    const permissionService = new PermissionCheckService();

    const hasPermission = await permissionService.checkPermission({
      userId,
      teamId,
      permission: "workflow.create",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    if (!hasPermission) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You don't have permission to create workflows for this team",
      });
    }
  }

  const template = WORKFLOW_TEMPLATES[templateId];

  try {
    const workflow: Workflow = await prisma.workflow.create({
      data: {
        name: name || template.name,
        trigger: template.trigger,
        time: template.time,
        timeUnit: template.timeUnit,
        userId,
        teamId,
      },
    });

    await ctx.prisma.workflowStep.create({
      data: {
        stepNumber: 1,
        action: WorkflowActions.CAL_AI_PHONE_CALL,
        template: WorkflowTemplates.CUSTOM,
        workflowId: workflow.id,
        sender: SENDER_NAME,
        numberVerificationPending: false,
        verifiedAt: new Date(),
        includeCalendarEvent: false,
      },
    });

    const redirectUrl = `/workflows/${workflow.id}?autoCreateAgent=true&templateWorkflowId=${templateId}`;

    return {
      workflow,
      redirectUrl
    };
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create Cal AI workflow",
      cause: error,
    });
  }
};
