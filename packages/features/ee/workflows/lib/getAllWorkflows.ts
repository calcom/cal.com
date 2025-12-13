import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import prisma from "@calcom/prisma";
import type { Prisma, WorkflowType } from "@calcom/prisma/client";
import { WorkflowType as PrismaWorkflowType } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

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

export const getAllWorkflows = async ({
  entityWorkflows,
  userId,
  teamId,
  orgId,
  workflowsLockedForUser = true,
  type,
}: {
  entityWorkflows: Workflow[];
  userId?: number | null;
  teamId?: number | null;
  orgId?: number | null;
  workflowsLockedForUser?: boolean;
  type: WorkflowType;
}) => {
  const allWorkflows = entityWorkflows;

  if (orgId) {
    if (teamId) {
      const orgTeamWorkflowsRel = await prisma.workflowsOnTeams.findMany({
        where: {
          teamId: teamId,
          workflow: {
            type,
          },
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
          workflow: {
            type,
          },
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
        type,
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
        type,
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
        type,
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

export async function getAllWorkflowsFromEventType(
  eventType: {
    workflows?: {
      workflow: Workflow;
    }[];
    teamId?: number | null;
    parentId?: number | null;
    parent?: {
      id?: number | null;
      teamId: number | null;
    } | null;
    metadata?: Prisma.JsonValue;
  } | null,
  userId?: number | null
) {
  if (!eventType) return [];

  const eventTypeWorkflows = eventType?.workflows?.map((workflowRel) => workflowRel.workflow) ?? [];

  const teamId = await getTeamIdFromEventType({
    eventType: {
      team: { id: eventType?.teamId ?? null },
      parentId: eventType?.parentId || eventType?.parent?.id || null,
    },
  });

  const orgId = await getOrgIdFromMemberOrTeamId({ memberId: userId, teamId });

  const isManagedEventType = !!eventType?.parent;

  const eventTypeMetadata = EventTypeMetaDataSchema.parse(eventType?.metadata || {});

  const workflowsLockedForUser = isManagedEventType
    ? !eventTypeMetadata?.managedEventConfig?.unlockedFields?.workflows
    : false;

  const allWorkflows = await getAllWorkflows({
    entityWorkflows: eventTypeWorkflows,
    userId,
    teamId,
    orgId,
    workflowsLockedForUser,
    type: PrismaWorkflowType.EVENT_TYPE,
  });

  return allWorkflows;
}
