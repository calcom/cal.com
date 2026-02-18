import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

export async function duplicateWorkflow({
  workflowId,
  targetTeamId,
  currentUserId,
}: {
  workflowId: number;
  targetTeamId?: number | null;
  currentUserId: number;
}) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    select: {
      id: true,
      name: true,
      trigger: true,
      time: true,
      timeUnit: true,
      userId: true,
      teamId: true,
      isActiveOnAll: true,
      steps: {
        orderBy: { stepNumber: "asc" },
      },
    },
  });

  if (!workflow) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });
  }

  // Determine the target context
  const effectiveTeamId = targetTeamId !== undefined ? targetTeamId : workflow.teamId;

  // If duplicating to a team, verify the user has ADMIN/OWNER role
  if (effectiveTeamId) {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_teamId: {
          userId: currentUserId,
          teamId: effectiveTeamId,
        },
      },
    });

    if (!membership || ![MembershipRole.ADMIN, MembershipRole.OWNER].includes(membership.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You must be an admin or owner of the target team to duplicate workflows to it.",
      });
    }
  }

  // Create the duplicated workflow
  const newWorkflow = await prisma.workflow.create({
    data: {
      name: workflow.name ? `${workflow.name} (copy)` : "",
      trigger: workflow.trigger,
      time: workflow.time,
      timeUnit: workflow.timeUnit,
      userId: effectiveTeamId ? null : currentUserId,
      teamId: effectiveTeamId,
      isActiveOnAll: false,
    },
  });

  // Duplicate the workflow steps
  if (workflow.steps.length > 0) {
    const stepsData = workflow.steps.map((step) => ({
      stepNumber: step.stepNumber,
      action: step.action,
      template: step.template,
      reminderBody: step.reminderBody,
      emailSubject: step.emailSubject,
      workflowId: newWorkflow.id,
      sender: step.sender,
      numberVerificationPending: false,
      verifiedAt: step.verifiedAt,
      includeCalendarEvent: step.includeCalendarEvent,
    }));

    await prisma.workflowStep.createMany({
      data: stepsData,
    });
  }

  return newWorkflow;
}
