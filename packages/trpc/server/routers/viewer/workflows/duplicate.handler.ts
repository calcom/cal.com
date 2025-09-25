import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TDuplicateInputSchema } from "./duplicate.schema";

type DuplicateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDuplicateInputSchema;
};

export const duplicateHandler = async ({ ctx, input }: DuplicateOptions) => {
  const workflowId = input.workflowId;

  // Get the original workflow
  const originalWorkflow = await prisma.workflow.findFirst({
    where: {
      id: workflowId,
    },
    include: {
      steps: true,
    },
  });

  if (!originalWorkflow) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Original workflow not found or unauthorized.",
    });
  }

  const duplicatedWorkflow = await prisma.workflow.create({
    data: {
      name: `${originalWorkflow.name || "Untitled"} (copy)`,
      trigger: originalWorkflow.trigger,
      time: originalWorkflow.time,
      timeUnit: originalWorkflow.timeUnit,
      userId: ctx.user.id,
      teamId: originalWorkflow.teamId,
    },
  });

  // Duplicate workflow steps
  await Promise.all(
    originalWorkflow.steps.map((step) =>
      prisma.workflowStep.create({
        data: {
          stepNumber: step.stepNumber,
          action: step.action,
          template: step.template,
          reminderBody: step.reminderBody,
          emailSubject: step.emailSubject,
          workflowId: duplicatedWorkflow.id,
          sender: step.sender,
          numberVerificationPending: step.numberVerificationPending,
          verifiedAt: step.verifiedAt,
        },
      })
    )
  );

  return { workflow: duplicatedWorkflow };
};
