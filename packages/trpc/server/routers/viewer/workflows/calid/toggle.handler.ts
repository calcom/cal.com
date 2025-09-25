import { isEmailAction } from "@calid/features/modules/workflows/config/utils";

import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

// import hasActiveTeamPlanHandler from "../../teams/hasActiveTeamPlan.handler";
import {
  isCalIdAuthorized,
  deleteCalIdRemindersOfActiveOnIds,
  scheduleCalIdWorkflowNotifications,
  upsertCalIdSmsReminderFieldForEventTypes,
  removeCalIdSmsReminderFieldForEventTypes,
} from "../util.calid";
import type { TCalIdToggleInputSchema } from "./toggle.schema";

type CalIdToggleOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id" | "metadata" | "locale" | "timeFormat">;
    prisma: PrismaClient;
  };
  input: TCalIdToggleInputSchema;
};

export const calIdToggleHandler = async ({ ctx, input }: CalIdToggleOptions) => {
  const { user, prisma } = ctx;
  const { id: workflowId, disabled } = input;
  const isEnabled = !disabled;

  const userWorkflow = await prisma.calIdWorkflow.findUnique({
    where: { id: workflowId },
    select: {
      id: true,
      userId: true,
      isActiveOnAll: true,
      trigger: true,
      time: true,
      timeUnit: true,
      calIdTeamId: true,
      calIdTeam: {
        select: {
          id: true,
          name: true,
        },
      },
      user: { select: { calIdTeams: true } },
      steps: true,
      activeOn: true,
      activeOnTeams: true,
    },
  });

  if (!userWorkflow) throw new TRPCError({ code: "NOT_FOUND", message: "CalId Workflow not found" });

  const isUserAuthorized = await isCalIdAuthorized(userWorkflow, user.id, true);
  if (!isUserAuthorized) throw new TRPCError({ code: "UNAUTHORIZED" });

  const hasPremium = hasKeyInMetadata(user, "isPremium") && user.metadata.isPremium;
  //   const teamsPlan = hasPremium ? { isActive: false } : await hasActiveTeamPlanHandler({ ctx });
  const teamsPlan = hasPremium ? { isActive: false } : { isActive: true, isTrial: false };

  const hasPaidPlan = IS_SELF_HOSTED || hasPremium || teamsPlan.isActive;

  const hasEmailActions = userWorkflow.steps.some((step) => isEmailAction(step.action));
  if (!hasPaidPlan && hasEmailActions && isEnabled) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Email workflows require a paid plan" });
  }

  let activeOnIds: number[] = [];

  // For CalId workflows, we only handle event types (no organization concept)
  if (userWorkflow.isActiveOnAll) {
    const eventTypes = await prisma.eventType.findMany({
      where: userWorkflow.calIdTeamId
        ? { calIdTeamId: userWorkflow.calIdTeamId }
        : { userId: userWorkflow.userId },
      select: {
        id: true,
        children: { select: { id: true } },
      },
    });
    activeOnIds = eventTypes.flatMap((et) => [et.id, ...et.children.map((child) => child.id)]);
  } else {
    const workflowEventTypes = await prisma.calIdWorkflowsOnEventTypes.findMany({
      where: { workflowId },
      select: {
        eventTypeId: true,
        eventType: { select: { children: { select: { id: true } } } },
      },
    });
    activeOnIds = workflowEventTypes.flatMap((rel) => [
      rel.eventTypeId,
      ...rel.eventType.children.map((child) => child.id),
    ]);
  }

  if (isEnabled) {
    await scheduleCalIdWorkflowNotifications({
      activeOn: activeOnIds,
      isCalIdTeam: false, // CalId workflows only handle event types
      workflowSteps: userWorkflow.steps,
      time: userWorkflow.time,
      timeUnit: userWorkflow.timeUnit,
      trigger: userWorkflow.trigger,
      userId: user.id,
      calIdTeamId: userWorkflow.calIdTeamId,
    });

    const needsSmsField = userWorkflow.steps.some(
      (step) => step.action === "SMS_ATTENDEE" || step.action === "WHATSAPP_ATTENDEE"
    );

    if (needsSmsField) {
      const isNumberRequired = userWorkflow.steps.some(
        (step) =>
          (step.action === "SMS_ATTENDEE" || step.action === "WHATSAPP_ATTENDEE") && step.numberRequired
      );

      await upsertCalIdSmsReminderFieldForEventTypes({
        activeOn: activeOnIds,
        workflowId,
        isSmsReminderNumberRequired: isNumberRequired,
        isCalIdTeam: false,
      });
    }
  } else {
    await deleteCalIdRemindersOfActiveOnIds({
      removedActiveOnIds: activeOnIds,
      workflowSteps: userWorkflow.steps,
      isCalIdTeam: false,
    });

    await removeCalIdSmsReminderFieldForEventTypes({
      activeOnToRemove: activeOnIds,
      workflowId,
    });
  }

  const updatedWorkflow = await prisma.calIdWorkflow.update({
    where: { id: workflowId },
    data: { disabled },
  });

  return {
    workflow: updatedWorkflow,
  };
};
