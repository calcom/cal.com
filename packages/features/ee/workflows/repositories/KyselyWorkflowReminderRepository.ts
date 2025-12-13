import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";
import { WorkflowMethods } from "@calcom/prisma/enums";

import type {
  IWorkflowReminderRepository,
  WorkflowReminderScheduledMessageDto,
  WorkflowReminderCreateInput,
  WorkflowReminderWithStepAndWorkflowDto,
} from "./IWorkflowReminderRepository";

export class KyselyWorkflowReminderRepository implements IWorkflowReminderRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  async findScheduledMessagesToCancel(params: {
    teamId?: number | null;
    userIdsWithNoCredits: number[];
  }): Promise<WorkflowReminderScheduledMessageDto[]> {
    const { teamId, userIdsWithNoCredits } = params;

    // Build the query to find workflow reminders that need to be cancelled
    const reminders = await this.dbRead
      .selectFrom("WorkflowReminder")
      .innerJoin("WorkflowStep", "WorkflowStep.id", "WorkflowReminder.workflowStepId")
      .innerJoin("Workflow", "Workflow.id", "WorkflowStep.workflowId")
      .leftJoin("Booking", "Booking.uid", "WorkflowReminder.bookingUid")
      .leftJoin("users", "users.id", "Booking.userId")
      .select([
        "WorkflowReminder.id",
        "WorkflowReminder.referenceId",
        "WorkflowReminder.scheduledDate",
        "WorkflowReminder.uuid",
        "WorkflowStep.action",
        "Booking.id as bookingId",
      ])
      .where("WorkflowReminder.scheduled", "=", true)
      .where((eb) =>
        eb.or([eb("WorkflowReminder.cancelled", "=", false), eb("WorkflowReminder.cancelled", "is", null)])
      )
      .where("WorkflowReminder.referenceId", "is not", null)
      .where("WorkflowReminder.method", "in", [WorkflowMethods.SMS, WorkflowMethods.WHATSAPP])
      .where((eb) => {
        const conditions = [eb("Workflow.userId", "in", userIdsWithNoCredits)];
        if (teamId) {
          conditions.push(eb("Workflow.teamId", "=", teamId));
        }
        return eb.or(conditions);
      })
      .execute();

    // Fetch attendees and user for each booking
    const results: WorkflowReminderScheduledMessageDto[] = [];

    for (const reminder of reminders) {
      let booking: WorkflowReminderScheduledMessageDto["booking"] = null;

      if (reminder.bookingId) {
        const attendees = await this.dbRead
          .selectFrom("Attendee")
          .select(["email", "locale"])
          .where("bookingId", "=", reminder.bookingId)
          .execute();

        const user = await this.dbRead
          .selectFrom("Booking")
          .innerJoin("users", "users.id", "Booking.userId")
          .select(["users.email"])
          .where("Booking.id", "=", reminder.bookingId)
          .executeTakeFirst();

        booking = {
          attendees: attendees.map((a) => ({ email: a.email, locale: a.locale })),
          user: user ? { email: user.email } : null,
        };
      }

      results.push({
        id: reminder.id,
        referenceId: reminder.referenceId,
        scheduledDate: reminder.scheduledDate!,
        uuid: reminder.uuid,
        workflowStep: reminder.action ? { action: reminder.action } : null,
        booking,
      });
    }

    return results;
  }

  async updateRemindersToEmail(params: { reminderIds: number[] }): Promise<{ count: number }> {
    const { reminderIds } = params;

    if (reminderIds.length === 0) {
      return { count: 0 };
    }

    const result = await this.dbWrite
      .updateTable("WorkflowReminder")
      .set({
        method: WorkflowMethods.EMAIL,
        referenceId: null,
      })
      .where("id", "in", reminderIds)
      .execute();

    return { count: Number(result[0]?.numUpdatedRows ?? 0) };
  }

  async create(input: WorkflowReminderCreateInput): Promise<{ id: number }> {
    const result = await this.dbWrite
      .insertInto("WorkflowReminder")
      .values({
        bookingUid: input.bookingUid,
        workflowStepId: input.workflowStepId,
        method: input.method,
        scheduledDate: input.scheduledDate,
        scheduled: input.scheduled,
        seatReferenceUid: input.seatReferenceUid ?? null,
      })
      .returning(["id"])
      .executeTakeFirstOrThrow();

    return { id: result.id };
  }

  async findByIdIncludeStepAndWorkflow(id: number): Promise<WorkflowReminderWithStepAndWorkflowDto | null> {
    const reminder = await this.dbRead
      .selectFrom("WorkflowReminder")
      .selectAll("WorkflowReminder")
      .where("WorkflowReminder.id", "=", id)
      .executeTakeFirst();

    if (!reminder) return null;

    let workflowStep: WorkflowReminderWithStepAndWorkflowDto["workflowStep"] = null;

    if (reminder.workflowStepId) {
      const step = await this.dbRead
        .selectFrom("WorkflowStep")
        .selectAll()
        .where("id", "=", reminder.workflowStepId)
        .executeTakeFirst();

      if (step) {
        const workflow = await this.dbRead
          .selectFrom("Workflow")
          .selectAll()
          .where("id", "=", step.workflowId)
          .executeTakeFirst();

        if (workflow) {
          workflowStep = {
            id: step.id,
            stepNumber: step.stepNumber,
            action: step.action,
            workflowId: step.workflowId,
            sendTo: step.sendTo,
            reminderBody: step.reminderBody,
            emailSubject: step.emailSubject,
            template: step.template,
            numberRequired: step.numberRequired,
            sender: step.sender,
            numberVerificationPending: step.numberVerificationPending,
            includeCalendarEvent: step.includeCalendarEvent,
            workflow: {
              id: workflow.id,
              name: workflow.name,
              userId: workflow.userId,
              teamId: workflow.teamId,
              trigger: workflow.trigger,
              time: workflow.time,
              timeUnit: workflow.timeUnit,
              isActiveOnAll: workflow.isActiveOnAll,
              position: workflow.position,
              type: workflow.type,
            },
          };
        }
      }
    }

    return {
      id: reminder.id,
      bookingUid: reminder.bookingUid,
      workflowStepId: reminder.workflowStepId,
      method: reminder.method,
      scheduledDate: reminder.scheduledDate,
      scheduled: reminder.scheduled,
      referenceId: reminder.referenceId,
      uuid: reminder.uuid,
      cancelled: reminder.cancelled,
      seatReferenceUid: reminder.seatReferenceUid,
      workflowStep,
    };
  }
}
