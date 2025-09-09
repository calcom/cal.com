import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TCalIdDuplicateInputSchema } from "./duplicate.schema";

type CalIdDuplicateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdDuplicateInputSchema;
};

export const calIdDuplicateHandler = async ({ ctx, input }: CalIdDuplicateOptions) => {
  const workflowId = input.workflowId;

  // Get the original workflow
  const originalWorkflow = await prisma.calIdWorkflow.findFirst({
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
      message: "Original CalId workflow not found or unauthorized.",
    });
  }

  const duplicatedWorkflow = await prisma.calIdWorkflow.create({
    data: {
      name: `${originalWorkflow.name || "Untitled"} (copy)`,
      trigger: originalWorkflow.trigger,
      time: originalWorkflow.time,
      timeUnit: originalWorkflow.timeUnit,
      userId: ctx.user.id,
      calIdTeamId: originalWorkflow.calIdTeamId,
    },
  });

  // Duplicate workflow steps
  await Promise.all(
    originalWorkflow.steps.map((step) =>
      prisma.calIdWorkflowStep.create({
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
