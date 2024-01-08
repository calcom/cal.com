import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import type { EventType, Prisma, User, WorkflowReminder, WorkflowStep } from "@calcom/prisma/client";
import { WorkflowMethods } from "@calcom/prisma/enums";

type PartialWorkflowStep = Partial<WorkflowStep> | null;

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
    > & { eventType: Partial<EventType> | null } & { user: Partial<User> | null })
  | null;

export type PartialWorkflowReminder = Pick<
  WorkflowReminder,
  "id" | "isMandatoryReminder" | "scheduledDate"
> & {
  booking: PartialBooking | null;
} & { workflowStep: PartialWorkflowStep };

async function getWorkflowReminders<T extends Prisma.WorkflowReminderSelect>(
  filter: Prisma.WorkflowReminderWhereInput,
  select: T
): Promise<Array<Prisma.WorkflowReminderGetPayload<{ select: T }>>> {
  const pageSize = 90;
  let pageNumber = 0;
  const filteredWorkflowReminders: Array<Prisma.WorkflowReminderGetPayload<{ select: T }>> = [];

  while (true) {
    const newFilteredWorkflowReminders = await prisma.workflowReminder.findMany({
      where: filter,
      select: select,
      skip: pageNumber * pageSize,
      take: pageSize,
    });

    if (newFilteredWorkflowReminders.length === 0) {
      break;
    }

    filteredWorkflowReminders.push(
      ...(newFilteredWorkflowReminders as Array<Prisma.WorkflowReminderGetPayload<{ select: T }>>)
    );
    pageNumber++;
  }

  return filteredWorkflowReminders;
}

type RemindersToDeleteType = { referenceId: string | null };

export async function getAllRemindersToDelete(): Promise<RemindersToDeleteType[]> {
  const whereFilter: Prisma.WorkflowReminderWhereInput = {
    method: WorkflowMethods.EMAIL,
    cancelled: true,
    scheduledDate: {
      lte: dayjs().toISOString(),
    },
  };

  const select: Prisma.WorkflowReminderSelect = {
    referenceId: true,
  };

  const remindersToDelete = await getWorkflowReminders(whereFilter, select);

  return remindersToDelete;
}

type RemindersToCancelType = { referenceId: string | null; id: number };

export async function getAllRemindersToCancel(): Promise<RemindersToCancelType[]> {
  const whereFilter: Prisma.WorkflowReminderWhereInput = {
    cancelled: true,
    scheduled: true, //if it is false then they are already cancelled
    scheduledDate: {
      lte: dayjs().add(1, "hour").toISOString(),
    },
  };

  const select: Prisma.WorkflowReminderSelect = {
    referenceId: true,
    id: true,
  };

  const remindersToCancel = await getWorkflowReminders(whereFilter, select);

  return remindersToCancel;
}

export async function getAllUnscheduledReminders(): Promise<PartialWorkflowReminder[]> {
  const whereFilter: Prisma.WorkflowReminderWhereInput = {
    method: WorkflowMethods.EMAIL,
    scheduled: false,
    scheduledDate: {
      lte: dayjs().add(72, "hour").toISOString(),
    },
    OR: [{ cancelled: false }, { cancelled: null }],
  };

  const select: Prisma.WorkflowReminderSelect = {
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
      },
    },
    booking: {
      select: {
        startTime: true,
        endTime: true,
        location: true,
        description: true,
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
            recurringEvent: true,
          },
        },
      },
    },
  };

  const unscheduledReminders = (await getWorkflowReminders(whereFilter, select)) as PartialWorkflowReminder[];

  return unscheduledReminders;
}
