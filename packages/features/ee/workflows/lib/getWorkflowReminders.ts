import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import type { EventType, Prisma, User, WorkflowReminder, WorkflowStep } from "@calcom/prisma/client";
import { WorkflowMethods } from "@calcom/prisma/enums";

type PartialWorkflowStep =
  | (Partial<WorkflowStep> & {
      workflow: {
        userId?: number;
        teamId?: number;
      };
    })
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
    > & {
      eventType:
        | (Partial<EventType> & {
            slug: string;
            team: { parentId?: number; hideBranding: boolean };
            hosts: { user: { email: string; destinationCalendar?: { primaryEmail: string } } }[] | undefined;
          })
        | null;
    } & {
      user: Partial<User> | null;
    })
  | null;

export type PartialWorkflowReminder = Pick<
  WorkflowReminder,
  "id" | "isMandatoryReminder" | "scheduledDate" | "uuid" | "seatReferenceId"
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
      // FIXME: This is a workaround to avoid type errors
      ...(newFilteredWorkflowReminders as unknown as Array<Prisma.WorkflowReminderGetPayload<{ select: T }>>)
    );
    pageNumber++;
  }

  return filteredWorkflowReminders;
}

type RemindersToDeleteType = { referenceId: string | null; id: number };

export async function getAllRemindersToDelete(): Promise<RemindersToDeleteType[]> {
  const whereFilter: Prisma.WorkflowReminderWhereInput = {
    method: WorkflowMethods.EMAIL,
    cancelled: true,
    referenceId: {
      not: null,
    },
    scheduledDate: {
      lt: dayjs().toISOString(),
    },
  };

  const select = {
    referenceId: true,
    id: true,
  } satisfies Prisma.WorkflowReminderSelect;

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

  const select = {
    referenceId: true,
    id: true,
  } satisfies Prisma.WorkflowReminderSelect;

  const remindersToCancel = await getWorkflowReminders(whereFilter, select);

  return remindersToCancel;
}

export const select = {
  id: true,
  scheduledDate: true,
  isMandatoryReminder: true,
  uuid: true,
  seatReferenceId: true,
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
              hideBranding: true,
            },
          },
          customReplyToEmail: true,
        },
      },
    },
  },
} satisfies Prisma.WorkflowReminderSelect;

export async function getAllUnscheduledReminders(): Promise<PartialWorkflowReminder[]> {
  const whereFilter: Prisma.WorkflowReminderWhereInput = {
    method: WorkflowMethods.EMAIL,
    scheduled: false,
    scheduledDate: {
      gte: new Date(),
      lte: dayjs().add(2, "hour").toISOString(),
    },
    retryCount: {
      lt: 3, // Don't continue retrying if it's already failed 3 times
    },
    OR: [{ cancelled: false }, { cancelled: null }],
  };

  const unscheduledReminders = (await getWorkflowReminders(whereFilter, select)) as PartialWorkflowReminder[];

  return unscheduledReminders;
}

export function getWorkflowRecipientEmail({
  action,
  organizerEmail,
  attendeeEmail,
  sendToEmail,
}: {
  action: string;
  organizerEmail?: string;
  attendeeEmail?: string;
  sendToEmail?: string | null;
}): string | null {
  // const action = reminder.workflowStep.action;

  switch (action) {
    case "EMAIL_ADDRESS":
      return sendToEmail || null;
    case "EMAIL_HOST":
      return organizerEmail || null;
    case "EMAIL_ATTENDEE":
      return attendeeEmail || null;
    case "SMS_ATTENDEE":
      return attendeeEmail || null;
    case "WHATSAPP_ATTENDEE":
      return attendeeEmail || null;
    case "SMS_NUMBER":
    case "WHATSAPP_NUMBER":
      return null;
    default:
      return null;
  }
}
