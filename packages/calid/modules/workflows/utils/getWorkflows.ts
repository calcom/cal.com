import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import type { EventType, Prisma, User, CalIdWorkflowReminder } from "@calcom/prisma/client";
import { WorkflowMethods } from "@calcom/prisma/enums";

import type { CalIdWorkflow, CalIdWorkflowStep } from "../config/types";

type PartialCalIdWorkflowStep =
  | (Partial<CalIdWorkflowStep> & { workflow: { userId?: number; calIdTeamId?: number } })
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

export type PartialCalIdWorkflowReminder = Pick<
  CalIdWorkflowReminder,
  "id" | "isMandatoryReminder" | "scheduledDate"
> & {
  booking: PartialBooking | null;
  // attendee: Attendee | null;
} & { workflowStep: PartialCalIdWorkflowStep };

const BATCH_PROCESSING_SIZE = 90;

async function fetchRemindersBatch<T extends Prisma.CalIdWorkflowReminderSelect>(
  queryFilter: Prisma.CalIdWorkflowReminderWhereInput,
  selectionCriteria: T
): Promise<Array<Prisma.CalIdWorkflowReminderGetPayload<{ select: T }>>> {
  const collectedReminders: Array<Prisma.CalIdWorkflowReminderGetPayload<{ select: T }>> = [];
  let batchIndex = 0;

  while (true) {
    const currentBatch = await prisma.calIdWorkflowReminder.findMany({
      where: queryFilter,
      select: selectionCriteria,
      skip: batchIndex * BATCH_PROCESSING_SIZE,
      take: BATCH_PROCESSING_SIZE,
    });

    if (currentBatch.length === 0) {
      break;
    }

    collectedReminders.push(
      ...(currentBatch as Array<Prisma.CalIdWorkflowReminderGetPayload<{ select: T }>>)
    );
    batchIndex++;
  }

  return collectedReminders;
}

type RemindersToDeleteType = { referenceId: string | null };

export async function getAllRemindersToDelete(): Promise<RemindersToDeleteType[]> {
  const deletionCriteria: Prisma.CalIdWorkflowReminderWhereInput = {
    method: WorkflowMethods.EMAIL,
    cancelled: true,
    scheduledDate: {
      lte: dayjs().toISOString(),
    },
  };

  const fieldSelection: Prisma.CalIdWorkflowReminderSelect = {
    referenceId: true,
  };

  const candidatesForDeletion = await fetchRemindersBatch(deletionCriteria, fieldSelection);

  return candidatesForDeletion;
}

type RemindersToCancelType = { referenceId: string | null; id: number };

export async function getAllRemindersToCancel(): Promise<RemindersToCancelType[]> {
  const cancellationCriteria: Prisma.CalIdWorkflowReminderWhereInput = {
    method: WorkflowMethods.EMAIL,
    cancelled: true,
    scheduled: true,
    scheduledDate: {
      lte: dayjs().add(1, "hour").toISOString(),
      gte: dayjs().toISOString(),
    },
  };

  const requiredFields: Prisma.CalIdWorkflowReminderSelect = {
    referenceId: true,
    id: true,
  };

  const candidatesForCancellation = await fetchRemindersBatch(cancellationCriteria, requiredFields);

  return candidatesForCancellation;
}

export const select: Prisma.CalIdWorkflowReminderSelect = {
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
          calIdTeamId: true,
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

export async function getAllUnscheduledReminders(): Promise<PartialCalIdWorkflowReminder[]> {
  const unscheduledCriteria: Prisma.CalIdWorkflowReminderWhereInput = {
    method: WorkflowMethods.EMAIL,
    scheduled: false,
    scheduledDate: {
      lte: dayjs().add(2, "hour").toISOString(),
      gte: dayjs().toISOString(),
    },
    OR: [{ cancelled: null }, { cancelled: false }],
  };

  const pendingReminders = (await fetchRemindersBatch(
    unscheduledCriteria,
    select
  )) as PartialCalIdWorkflowReminder[];

  return pendingReminders;
}

// TODO: Remove this select at some point, (calIdWorkflowSelect is contains all its fields and more)
export const workflowSelect = {
  id: true,
  trigger: true,
  time: true,
  timeUnit: true,
  userId: true,
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

export const calIdWorkflowSelect = {
  id: true,
  trigger: true,
  calIdTeamId: true,
  calIdTeam: { select: { id: true, name: true, slug: true, logoUrl: true, members: true } },
  time: true,
  timeUnit: true,
  userId: true,
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

async function fetchOrganizationTeamWorkflows(targetTeamId: number): Promise<CalIdWorkflow[]> {
  const teamWorkflowRelations = await prisma.calIdWorkflowsOnTeams.findMany({
    where: { calIdTeamId: targetTeamId },
    select: { workflow: { select: calIdWorkflowSelect } },
  });

  return teamWorkflowRelations.map((relation) => relation.workflow);
}

async function fetchOrganizationUserWorkflows(targetUserId: number): Promise<CalIdWorkflow[]> {
  const userWorkflowRelations = await prisma.calIdWorkflowsOnTeams.findMany({
    where: {
      calIdTeam: {
        members: {
          some: {
            userId: targetUserId,
            acceptedInvitation: true,
          },
        },
      },
    },
    select: {
      workflow: { select: calIdWorkflowSelect },
      calIdTeam: true,
    },
  });

  return userWorkflowRelations.map((relation) => relation.workflow);
}

async function fetchUniversalActiveWorkflows(entityId: number): Promise<CalIdWorkflow[]> {
  return prisma.calIdWorkflow.findMany({
    where: {
      calIdTeamId: entityId,
      isActiveOnAll: true,
    },
    select: calIdWorkflowSelect,
  });
}

async function fetchPersonalActiveWorkflows(targetUserId: number): Promise<CalIdWorkflow[]> {
  return prisma.calIdWorkflow.findMany({
    where: {
      userId: targetUserId,
      calIdTeamId: null,
      isActiveOnAll: true,
    },
    select: calIdWorkflowSelect,
  });
}

function removeDuplicateWorkflows(workflowCollection: CalIdWorkflow[]): CalIdWorkflow[] {
  const processedIds = new Set<number>();

  return workflowCollection.filter((workflowItem) => {
    const isAlreadyProcessed = processedIds.has(workflowItem.id);
    processedIds.add(workflowItem.id);
    return !isAlreadyProcessed;
  });
}

export const getAllWorkflows = async (
  eventTypeWorkflows: CalIdWorkflow[],
  userId?: number | null,
  teamId?: number | null,
  orgId?: number | null,
  workflowsLockedForUser = true
) => {
  const combinedWorkflows: CalIdWorkflow[] = [...eventTypeWorkflows];

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
