import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { WorkflowTriggerEvents } from "@calcom/prisma/enums";

import type { Workflow } from "./types";

export const workflowSelect = {
  id: true,
  trigger: true,
  time: true,
  timeUnit: true,
  userId: true,
  teamId: true,
  name: true,
  steps: {
    select: {
      id: true,
      action: true,
      sendTo: true,
      reminderBody: true,
      emailSubject: true,
      template: true,
      numberVerificationPending: true,
      sender: true,
      includeCalendarEvent: true,
      numberRequired: true,
      verifiedAt: true,
    },
  },
};

export const getAllWorkflows = async (
  eventTypeWorkflows: Workflow[],
  userId?: number | null,
  teamId?: number | null,
  orgId?: number | null,
  workflowsLockedForUser = true,
  allowedTriggerEvents?: WorkflowTriggerEvents[]
) => {
  const allWorkflows = eventTypeWorkflows.filter((workflow) => {
    if (!allowedTriggerEvents) return true;
    return allowedTriggerEvents.includes(workflow.trigger);
  });
  const workflowWhere: Prisma.WorkflowWhereInput | undefined =
    allowedTriggerEvents && allowedTriggerEvents.length > 0
      ? {
          trigger: {
            in: allowedTriggerEvents,
          },
        }
      : undefined;

  if (orgId) {
    if (teamId) {
      const orgTeamWorkflowsRel = await prisma.workflowsOnTeams.findMany({
        where: {
          teamId: teamId,
          workflow: workflowWhere,
        },
        select: {
          workflow: {
            select: workflowSelect,
          },
        },
      });

      const orgTeamWorkflows = orgTeamWorkflowsRel?.map((workflowRel) => workflowRel.workflow) ?? [];
      allWorkflows.push(...orgTeamWorkflows);
    } else if (userId) {
      const orgUserWorkflowsRel = await prisma.workflowsOnTeams.findMany({
        where: {
          workflow: workflowWhere,
          team: {
            members: {
              some: {
                userId: userId,
                accepted: true,
              },
            },
          },
        },
        select: {
          workflow: {
            select: workflowSelect,
          },
          team: true,
        },
      });

      const orgUserWorkflows = orgUserWorkflowsRel.map((workflowRel) => workflowRel.workflow) ?? [];
      allWorkflows.push(...orgUserWorkflows);
    }
    // get workflows that are active on all
    const activeOnAllOrgWorkflows = await prisma.workflow.findMany({
      where: {
        teamId: orgId,
        isActiveOnAll: true,
        ...workflowWhere,
      },
      select: workflowSelect,
    });
    allWorkflows.push(...activeOnAllOrgWorkflows);
  }

  if (teamId) {
    const activeOnAllTeamWorkflows = await prisma.workflow.findMany({
      where: {
        teamId,
        isActiveOnAll: true,
        ...workflowWhere,
      },
      select: workflowSelect,
    });
    allWorkflows.push(...activeOnAllTeamWorkflows);
  }

  if ((!teamId || !workflowsLockedForUser) && userId) {
    const activeOnAllUserWorkflows = await prisma.workflow.findMany({
      where: {
        userId,
        teamId: null,
        isActiveOnAll: true,
        ...workflowWhere,
      },
      select: workflowSelect,
    });
    allWorkflows.push(...activeOnAllUserWorkflows);
  }

  // remove all the duplicate workflows from allWorkflows
  const seen = new Set();

  const workflows = allWorkflows.filter((workflow) => {
    const duplicate = seen.has(workflow.id);
    seen.add(workflow.id);
    return !duplicate;
  });

  return workflows;
};
