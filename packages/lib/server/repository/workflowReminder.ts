import dayjs from "@calcom/dayjs";
import type { PrismaClient } from "@calcom/prisma";
import type { EventType, User, WorkflowReminder, WorkflowStep } from "@calcom/prisma/client";
import type { Prisma } from "@calcom/prisma/client";
import { WorkflowMethods } from "@calcom/prisma/enums";

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
  "id" | "isMandatoryReminder" | "scheduledDate" | "uuid"
> & {
  booking: PartialBooking | null;
} & { workflowStep: PartialWorkflowStep };

const workflowReminderSelect = {
  id: true,
  scheduledDate: true,
  isMandatoryReminder: true,
  uuid: true,
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

export class WorkflowReminderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private async getWorkflowReminders<T extends Prisma.WorkflowReminderSelect>(
    filter: Prisma.WorkflowReminderWhereInput,
    select: T
  ): Promise<Array<Prisma.WorkflowReminderGetPayload<{ select: T }>>> {
    const pageSize = 90;
    let pageNumber = 0;
    const filteredWorkflowReminders: Array<Prisma.WorkflowReminderGetPayload<{ select: T }>> = [];

    while (true) {
      const newFilteredWorkflowReminders = await this.prisma.workflowReminder.findMany({
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

  async getAllRemindersToDelete(): Promise<{ referenceId: string | null; id: number }[]> {
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

    const remindersToDelete = await this.getWorkflowReminders(whereFilter, select);

    return remindersToDelete;
  }

  async getAllRemindersToCancel(): Promise<{ referenceId: string | null; id: number }[]> {
    const whereFilter: Prisma.WorkflowReminderWhereInput = {
      cancelled: true,
      scheduled: true,
      scheduledDate: {
        lte: dayjs().add(1, "hour").toISOString(),
      },
    };

    const select = {
      referenceId: true,
      id: true,
    } satisfies Prisma.WorkflowReminderSelect;

    const remindersToCancel = await this.getWorkflowReminders(whereFilter, select);

    return remindersToCancel;
  }

  async getAllUnscheduledReminders(): Promise<PartialWorkflowReminder[]> {
    const whereFilter: Prisma.WorkflowReminderWhereInput = {
      method: WorkflowMethods.EMAIL,
      scheduled: false,
      scheduledDate: {
        lte: dayjs().add(2, "hour").toISOString(),
      },
      OR: [{ cancelled: false }, { cancelled: null }],
    };

    const unscheduledReminders = (await this.getWorkflowReminders(
      whereFilter,
      workflowReminderSelect
    )) as PartialWorkflowReminder[];

    return unscheduledReminders;
  }

  async getUnscheduledSMSReminders(): Promise<(PartialWorkflowReminder & { retryCount: number })[]> {
    const whereFilter: Prisma.WorkflowReminderWhereInput = {
      method: WorkflowMethods.SMS,
      scheduled: false,
      scheduledDate: {
        lte: dayjs().add(2, "hour").toISOString(),
      },
      retryCount: {
        lt: 3,
      },
    };

    const select = {
      ...workflowReminderSelect,
      retryCount: true,
    } satisfies Prisma.WorkflowReminderSelect;

    const unscheduledReminders = (await this.getWorkflowReminders(
      whereFilter,
      select
    )) as (PartialWorkflowReminder & { retryCount: number })[];

    return unscheduledReminders;
  }

  async getUnscheduledWhatsappReminders(): Promise<PartialWorkflowReminder[]> {
    const whereFilter: Prisma.WorkflowReminderWhereInput = {
      method: WorkflowMethods.WHATSAPP,
      scheduled: false,
      scheduledDate: {
        lte: dayjs().add(2, "hour").toISOString(),
      },
    };

    const unscheduledReminders = (await this.getWorkflowReminders(
      whereFilter,
      workflowReminderSelect
    )) as PartialWorkflowReminder[];

    return unscheduledReminders;
  }

  async updateReminderAsScheduled(
    id: number,
    data: { referenceId?: string | null; uuid?: string; scheduled?: boolean }
  ) {
    return await this.prisma.workflowReminder.update({
      where: { id },
      data: {
        scheduled: data.scheduled ?? true,
        ...(data.referenceId !== undefined && { referenceId: data.referenceId }),
        ...(data.uuid && { uuid: data.uuid }),
      },
    });
  }

  async updateReminderRetryCount(id: number, retryCount: number) {
    return await this.prisma.workflowReminder.update({
      where: { id },
      data: { retryCount },
    });
  }

  async deleteReminder(id: number) {
    return await this.prisma.workflowReminder.delete({
      where: { id },
    });
  }

  async deletePastWhatsappReminders() {
    return await this.prisma.workflowReminder.deleteMany({
      where: {
        method: WorkflowMethods.WHATSAPP,
        scheduledDate: {
          lte: dayjs().toISOString(),
        },
      },
    });
  }

  async updateReminderReferenceId(id: number, referenceId: string | null) {
    return await this.prisma.workflowReminder.update({
      where: { id },
      data: { referenceId },
    });
  }

  async markReminderAsCancelled(id: number) {
    return await this.prisma.workflowReminder.update({
      where: { id },
      data: { scheduled: false },
    });
  }
}
