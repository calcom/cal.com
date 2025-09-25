import { isEmailAction } from "@calid/features/modules/workflows/config/utils";

import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import hasActiveTeamPlanHandler from "../teams/hasActiveTeamPlan.handler";
import type { TToggleInputSchema } from "./toggle.schema";
import {
  isAuthorized,
  deleteRemindersOfActiveOnIds,
  scheduleWorkflowNotifications,
  upsertSmsReminderFieldForEventTypes,
  removeSmsReminderFieldForEventTypes,
} from "./util";

type ToggleOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id" | "metadata" | "locale" | "timeFormat">;
    prisma: PrismaClient;
  };
  input: TToggleInputSchema;
};

export const toggleHandler = async ({ ctx, input }: ToggleOptions) => {
  const { user, prisma } = ctx;
  const { id: workflowId, disabled } = input;
  const isEnabled = !disabled;

  const userWorkflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    select: {
      id: true,
      userId: true,
      isActiveOnAll: true,
      trigger: true,
      time: true,
      timeUnit: true,
      teamId: true,
      team: { select: { isOrganization: true } },
      user: { select: { teams: true } },
      steps: true,
      activeOn: true,
      activeOnTeams: true,
    },
  });

  if (!userWorkflow) throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });

  const isUserAuthorized = await isAuthorized(userWorkflow, user.id, true);
  if (!isUserAuthorized) throw new TRPCError({ code: "UNAUTHORIZED" });

  const isOrg = !!userWorkflow.team?.isOrganization;
  const hasPremium = hasKeyInMetadata(user, "isPremium") && user.metadata.isPremium;
  const teamsPlan = hasPremium ? { isActive: false } : await hasActiveTeamPlanHandler({ ctx });
  const hasPaidPlan = IS_SELF_HOSTED || hasPremium || teamsPlan.isActive;

  const hasEmailActions = userWorkflow.steps.some((step) => isEmailAction(step.action));
  if (!hasPaidPlan && hasEmailActions && isEnabled) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Email workflows require a paid plan" });
  }

  let activeOnIds: number[] = [];

  if (!isOrg) {
    if (userWorkflow.isActiveOnAll) {
      const eventTypes = await prisma.eventType.findMany({
        where: userWorkflow.teamId ? { teamId: userWorkflow.teamId } : { userId: userWorkflow.userId },
        select: {
          id: true,
          children: { select: { id: true } },
        },
      });
      activeOnIds = eventTypes.flatMap((et) => [et.id, ...et.children.map((child) => child.id)]);
    } else {
      const workflowEventTypes = await prisma.workflowsOnEventTypes.findMany({
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
  } else {
    if (userWorkflow.isActiveOnAll) {
      const teams = await prisma.team.findMany({
        where: { parent: { id: userWorkflow.teamId ?? 0 } },
        select: { id: true },
      });
      activeOnIds = teams.map((team) => team.id);
    } else {
      const workflowTeams = await prisma.workflowsOnTeams.findMany({
        where: { workflowId },
        select: { teamId: true },
      });
      activeOnIds = workflowTeams.map((rel) => rel.teamId);
    }
  }

  if (isEnabled) {
    await scheduleWorkflowNotifications({
      activeOn: activeOnIds,
      isOrg,
      workflowSteps: userWorkflow.steps,
      time: userWorkflow.time,
      timeUnit: userWorkflow.timeUnit,
      trigger: userWorkflow.trigger,
      userId: user.id,
      teamId: userWorkflow.teamId,
    });

    const needsSmsField = userWorkflow.steps.some(
      (step) => step.action === "SMS_ATTENDEE" || step.action === "WHATSAPP_ATTENDEE"
    );

    if (needsSmsField) {
      const isNumberRequired = userWorkflow.steps.some(
        (step) =>
          (step.action === "SMS_ATTENDEE" || step.action === "WHATSAPP_ATTENDEE") && step.numberRequired
      );

      await upsertSmsReminderFieldForEventTypes({
        activeOn: activeOnIds,
        workflowId,
        isSmsReminderNumberRequired: isNumberRequired,
        isOrg,
      });
    }
  } else {
    await deleteRemindersOfActiveOnIds({
      removedActiveOnIds: activeOnIds,
      workflowSteps: userWorkflow.steps,
      isOrg,
    });

    await removeSmsReminderFieldForEventTypes({
      activeOnToRemove: activeOnIds,
      workflowId,
      isOrg,
    });
  }

  const updatedWorkflow = await prisma.workflow.update({
    where: { id: workflowId },
    data: { disabled },
  });

  return {
    workflow: updatedWorkflow,
  };
};
