import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import type { EventType, Prisma, User, WorkflowReminder } from "@calcom/prisma/client";
import { WorkflowMethods } from "@calcom/prisma/enums";

import type { Workflow, WorkflowStep } from "../config/types";

type PartialWorkflowStep =
  | (Partial<WorkflowStep> & { workflow: { userId?: number; teamId?: number } })
  | null;

type Booking = Prisma.BookingGetPayload<{
  include: {
    attendees: true;
  };
}>;

type PartialBooking =
  | (Pick<
      Booking,
      | "startTime"
      | "endTime"
      | "location"
      | "description"
      | "metadata"
      | "customInputs"
      | "responses"
      | "uid"
      | "attendees"
      | "userPrimaryEmail"
      | "smsReminderNumber"
      | "title"
      | "eventTypeId"
    > & {
      eventType:
        | (Partial<EventType> & {
            slug: string;
            team: { parentId?: number };
            hosts: { user: { email: string; destinationCalendar?: { primaryEmail: string } } }[] | undefined;
          })
        | null;
    } & {
      user: Partial<User> | null;
    })
  | null;

export type PartialWorkflowReminder = Pick<
  WorkflowReminder,
  "id" | "isMandatoryReminder" | "scheduledDate"
> & {
  booking: PartialBooking | null;
  // attendee: Attendee | null;
} & { workflowStep: PartialWorkflowStep };

const BATCH_PROCESSING_SIZE = 90;

async function fetchRemindersBatch<T extends Prisma.WorkflowReminderSelect>(
  queryFilter: Prisma.WorkflowReminderWhereInput,
  selectionCriteria: T
): Promise<Array<Prisma.WorkflowReminderGetPayload<{ select: T }>>> {
  const collectedReminders: Array<Prisma.WorkflowReminderGetPayload<{ select: T }>> = [];
  let batchIndex = 0;

  while (true) {
    const currentBatch = await prisma.workflowReminder.findMany({
      where: queryFilter,
      select: selectionCriteria,
      skip: batchIndex * BATCH_PROCESSING_SIZE,
      take: BATCH_PROCESSING_SIZE,
    });

    if (currentBatch.length === 0) {
      break;
    }

    collectedReminders.push(...(currentBatch as Array<Prisma.WorkflowReminderGetPayload<{ select: T }>>));
    batchIndex++;
  }

  return collectedReminders;
}

type RemindersToDeleteType = { referenceId: string | null };

export async function getAllRemindersToDelete(): Promise<RemindersToDeleteType[]> {
  const deletionCriteria: Prisma.WorkflowReminderWhereInput = {
    method: WorkflowMethods.EMAIL,
    cancelled: true,
    scheduledDate: {
      lte: dayjs().toISOString(),
    },
  };

  const fieldSelection: Prisma.WorkflowReminderSelect = {
    referenceId: true,
  };

  const candidatesForDeletion = await fetchRemindersBatch(deletionCriteria, fieldSelection);

  return candidatesForDeletion;
}

type RemindersToCancelType = { referenceId: string | null; id: number };

export async function getAllRemindersToCancel(): Promise<RemindersToCancelType[]> {
  const cancellationCriteria: Prisma.WorkflowReminderWhereInput = {
    method: WorkflowMethods.EMAIL,
    cancelled: true,
    scheduled: true,
    scheduledDate: {
      lte: dayjs().add(1, "hour").toISOString(),
    },
  };

  const requiredFields: Prisma.WorkflowReminderSelect = {
    referenceId: true,
    id: true,
  };

  const candidatesForCancellation = await fetchRemindersBatch(cancellationCriteria, requiredFields);

  return candidatesForCancellation;
}

export const select: Prisma.WorkflowReminderSelect = {
  id: true,
  scheduledDate: true,
  isMandatoryReminder: true,
  workflowStep: {
    select: {
      action: true,
      sendTo: true,
      reminderBody: true,
      emailSubject: true,
      template: true,
      sender: true,
      includeCalendarEvent: true,
      workflow: {
        select: {
          userId: true,
          teamId: true,
        },
      },
    },
  },
  booking: {
    select: {
      startTime: true,
      endTime: true,
      location: true,
      description: true,
      smsReminderNumber: true,
      userPrimaryEmail: true,
      eventTypeId: true,
      user: {
        select: {
          email: true,
          name: true,
          timeZone: true,
          locale: true,
          username: true,
          timeFormat: true,
          hideBranding: true,
        },
      },
      metadata: true,
      uid: true,
      customInputs: true,
      responses: true,
      attendees: true,
      eventType: {
        select: {
          bookingFields: true,
          title: true,
          slug: true,
          hosts: {
            select: {
              user: {
                select: {
                  email: true,
                  destinationCalendar: {
                    select: {
                      primaryEmail: true,
                    },
                  },
                },
              },
            },
          },
          recurringEvent: true,
          team: {
            select: {
              parentId: true,
            },
          },
        },
      },
    },
  },
};

export async function getAllUnscheduledReminders(): Promise<PartialWorkflowReminder[]> {
  const unscheduledCriteria: Prisma.WorkflowReminderWhereInput = {
    method: WorkflowMethods.EMAIL,
    scheduled: false,
    scheduledDate: {
      lte: dayjs().add(2, "hour").toISOString(),
    },
    OR: [{ cancelled: null }, { cancelled: false }],
  };

  const pendingReminders = (await fetchRemindersBatch(
    unscheduledCriteria,
    select
  )) as PartialWorkflowReminder[];

  return pendingReminders;
}

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
      workflowId: true,
      stepNumber: true,
      // disableOnMarkNoShow: true,
    },
  },
};

async function fetchOrganizationTeamWorkflows(targetTeamId: number): Promise<Workflow[]> {
  const teamWorkflowRelations = await prisma.workflowsOnTeams.findMany({
    where: { teamId: targetTeamId },
    select: { workflow: { select: workflowSelect } },
  });

  return teamWorkflowRelations.map((relation) => relation.workflow);
}

async function fetchOrganizationUserWorkflows(targetUserId: number): Promise<Workflow[]> {
  const userWorkflowRelations = await prisma.workflowsOnTeams.findMany({
    where: {
      team: {
        members: {
          some: {
            userId: targetUserId,
            accepted: true,
          },
        },
      },
    },
    select: {
      workflow: { select: workflowSelect },
      team: true,
    },
  });

  return userWorkflowRelations.map((relation) => relation.workflow);
}

async function fetchUniversalActiveWorkflows(entityId: number): Promise<Workflow[]> {
  return prisma.workflow.findMany({
    where: {
      teamId: entityId,
      isActiveOnAll: true,
    },
    select: workflowSelect,
  });
}

async function fetchPersonalActiveWorkflows(targetUserId: number): Promise<Workflow[]> {
  return prisma.workflow.findMany({
    where: {
      userId: targetUserId,
      teamId: null,
      isActiveOnAll: true,
    },
    select: workflowSelect,
  });
}

function removeDuplicateWorkflows(workflowCollection: Workflow[]): Workflow[] {
  const processedIds = new Set<number>();

  return workflowCollection.filter((workflowItem) => {
    const isAlreadyProcessed = processedIds.has(workflowItem.id);
    processedIds.add(workflowItem.id);
    return !isAlreadyProcessed;
  });
}

export const getAllWorkflows = async (
  eventTypeWorkflows: Workflow[],
  userId?: number | null,
  teamId?: number | null,
  orgId?: number | null,
  workflowsLockedForUser = true
) => {
  const combinedWorkflows: Workflow[] = [...eventTypeWorkflows];

  if (orgId) {
    if (teamId) {
      const orgTeamWorkflows = await fetchOrganizationTeamWorkflows(teamId);
      combinedWorkflows.push(...orgTeamWorkflows);
    } else if (userId) {
      const orgUserWorkflows = await fetchOrganizationUserWorkflows(userId);
      combinedWorkflows.push(...orgUserWorkflows);
    }

    const organizationUniversalWorkflows = await fetchUniversalActiveWorkflows(orgId);
    combinedWorkflows.push(...organizationUniversalWorkflows);
  }

  if (teamId) {
    const teamUniversalWorkflows = await fetchUniversalActiveWorkflows(teamId);
    combinedWorkflows.push(...teamUniversalWorkflows);
  }

  const shouldIncludePersonalWorkflows = (!teamId || !workflowsLockedForUser) && userId;
  if (shouldIncludePersonalWorkflows) {
    const personalUniversalWorkflows = await fetchPersonalActiveWorkflows(userId);
    combinedWorkflows.push(...personalUniversalWorkflows);
  }

  return removeDuplicateWorkflows(combinedWorkflows);
};
