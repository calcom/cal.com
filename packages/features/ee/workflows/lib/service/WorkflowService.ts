import dayjs from "@calcom/dayjs";
import { getAllWorkflows } from "@calcom/ee/workflows/lib/getAllWorkflows";
import type { ScheduleWorkflowRemindersArgs } from "@calcom/ee/workflows/lib/reminders/reminderScheduler";
import { scheduleWorkflowReminders } from "@calcom/ee/workflows/lib/reminders/reminderScheduler";
import type { timeUnitLowerCase } from "@calcom/ee/workflows/lib/reminders/smsReminderManager";
import type { Workflow, WorkflowStep } from "@calcom/ee/workflows/lib/types";
import type { CreditCheckFn } from "@calcom/features/ee/billing/credit-service";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { WorkflowReminderRepository } from "@calcom/features/ee/workflows/repositories/WorkflowReminderRepository";
import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import { getHideBranding } from "@calcom/features/profile/lib/hideBranding";
import { tasker } from "@calcom/features/tasker";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { WorkflowTriggerEvents, WorkflowType, WorkflowMethods } from "@calcom/prisma/enums";
import type { TimeUnit } from "@calcom/prisma/enums";
import type { FORM_SUBMITTED_WEBHOOK_RESPONSES } from "@calcom/routing-forms/lib/formSubmissionUtils";
import { CalendarEvent } from "@calcom/types/Calendar";

// TODO (Sean): Move most of the logic migrated in 16861 to this service
export class WorkflowService {
  static _beforeAfterEventTriggers: WorkflowTriggerEvents[] = [
    WorkflowTriggerEvents.AFTER_EVENT,
    WorkflowTriggerEvents.BEFORE_EVENT,
  ];

  static async getAllWorkflowsFromRoutingForm(routingForm: {
    id: string;
    userId: number | null;
    teamId: number | null;
  }) {
    const routingFormWorkflows = await WorkflowRepository.findWorkflowsActiveOnRoutingForm({
      routingFormId: routingForm.id,
    });

    const teamId = routingForm.teamId;
    const userId = routingForm.userId;
    const orgId = await getOrgIdFromMemberOrTeamId({ memberId: userId, teamId });

    const allWorkflows = await getAllWorkflows({
      entityWorkflows: routingFormWorkflows,
      userId,
      teamId,
      orgId,
      workflowsLockedForUser: false,
      type: WorkflowType.ROUTING_FORM,
    });

    return allWorkflows;
  }

  static async deleteWorkflowRemindersOfRemovedTeam(teamId: number) {
    const teamRepository = new TeamRepository(prisma);
    const team = await teamRepository.findById({ id: teamId });

    if (team?.parentId) {
      const activeWorkflowsOnTeam = await WorkflowRepository.findActiveWorkflowsOnTeam({
        parentTeamId: team.parentId,
        teamId: team.id,
      });

      for (const workflow of activeWorkflowsOnTeam) {
        const workflowSteps = workflow.steps;
        let remainingActiveOnIds = [];

        if (workflow.isActiveOnAll) {
          const teamRepository = new TeamRepository(prisma);
          const allRemainingOrgTeams = await teamRepository.findOrgTeamsExcludingTeam({
            parentId: team.parentId,
            excludeTeamId: team.id,
          });
          remainingActiveOnIds = allRemainingOrgTeams.map((team) => team.id);
        } else {
          remainingActiveOnIds = workflow.activeOnTeams
            .filter((activeOn) => activeOn.teamId !== team.id)
            .map((activeOn) => activeOn.teamId);
        }
        const remindersToDelete = await WorkflowRepository.getRemindersFromRemovedTeams(
          [team.id],
          workflowSteps,
          remainingActiveOnIds
        );
        await WorkflowRepository.deleteAllWorkflowReminders(remindersToDelete);
      }
    }
  }

  static async scheduleFormWorkflows({
    workflows,
    responses,
    form,
    responseId,
    routedEventTypeId,
    creditCheckFn,
  }: {
    responseId: number;
    workflows: Workflow[];
    responses: FORM_SUBMITTED_WEBHOOK_RESPONSES;
    routedEventTypeId: number | null;
    creditCheckFn: CreditCheckFn;
    form: {
      id: string;
      userId: number;
      teamId?: number | null;
      fields?: { type: string; identifier?: string }[];
      user: {
        email: string;
        timeFormat: number | null;
        locale: string | null;
      };
    };
  }) {
    if (workflows.length <= 0) return;

    const workflowsToTrigger: Workflow[] = [];

    workflowsToTrigger.push(
      ...workflows.filter((workflow) => workflow.trigger === WorkflowTriggerEvents.FORM_SUBMITTED)
    );

    let smsReminderNumber: string | null = null;
    if (form.fields) {
      const phoneField = form.fields.find((field) => field.type === "phone");
      if (phoneField && phoneField.identifier) {
        const phoneResponse = responses[phoneField.identifier];
        if (phoneResponse?.response && typeof phoneResponse.response === "string") {
          smsReminderNumber = phoneResponse.response as string;
        }
      }
    }

    const hideBranding = await getHideBranding({
      userId: form.userId,
      teamId: form.teamId ?? undefined,
    });

    await scheduleWorkflowReminders({
      smsReminderNumber,
      formData: {
        responses,
        user: { email: form.user.email, timeFormat: form.user.timeFormat, locale: form.user.locale ?? "en" },
        routedEventTypeId,
      },
      hideBranding,
      workflows: workflowsToTrigger,
      creditCheckFn,
    });

    const workflowsToSchedule: Workflow[] = [];

    workflowsToSchedule.push(
      ...workflows.filter((workflow) => workflow.trigger === WorkflowTriggerEvents.FORM_SUBMITTED_NO_EVENT)
    );

    const promisesFormSubmittedNoEvent = workflowsToSchedule.map((workflow) => {
      const timeUnit: timeUnitLowerCase = (workflow.timeUnit?.toLowerCase() as timeUnitLowerCase) ?? "minute";

      const scheduledAt = dayjs()
        .add(workflow.time ?? 15, timeUnit)
        .toDate();

      return tasker.create(
        "triggerFormSubmittedNoEventWorkflow",
        {
          responseId,
          responses,
          smsReminderNumber,
          hideBranding,
          routedEventTypeId,
          form: {
            id: form.id,
            userId: form.userId,
            teamId: form.teamId ?? undefined,
            user: {
              email: form.user.email,
              timeFormat: form.user.timeFormat,
              locale: form.user.locale ?? "en",
            },
          },
          workflow,
          submittedAt: new Date(),
        },
        { scheduledAt }
      );
    });
    await Promise.all(promisesFormSubmittedNoEvent);
  }

  static async scheduleWorkflowsForNewBooking({
    isNormalBookingOrFirstRecurringSlot,
    isConfirmedByDefault,
    isRescheduleEvent,
    workflows,
    ...args
  }: ScheduleWorkflowRemindersArgs & {
    isConfirmedByDefault: boolean;
    isRescheduleEvent: boolean;
    isNormalBookingOrFirstRecurringSlot: boolean;
  }) {
    if (workflows.length <= 0) return;

    const workflowsToTrigger: Workflow[] = [];

    if (isRescheduleEvent) {
      workflowsToTrigger.push(
        ...workflows.filter(
          (workflow) =>
            workflow.trigger === WorkflowTriggerEvents.RESCHEDULE_EVENT ||
            this._beforeAfterEventTriggers.includes(workflow.trigger)
        )
      );
    } else if (!isConfirmedByDefault) {
      workflowsToTrigger.push(
        ...workflows.filter((workflow) => workflow.trigger === WorkflowTriggerEvents.BOOKING_REQUESTED)
      );
    } else if (isConfirmedByDefault) {
      workflowsToTrigger.push(
        ...workflows.filter(
          (workflow) =>
            this._beforeAfterEventTriggers.includes(workflow.trigger) ||
            (isNormalBookingOrFirstRecurringSlot && workflow.trigger === WorkflowTriggerEvents.NEW_EVENT)
        )
      );
    }

    if (workflowsToTrigger.length === 0) return;

    await scheduleWorkflowReminders({
      ...args,
      workflows: workflowsToTrigger,
    });
  }

  static async scheduleWorkflowsFilteredByTriggerEvent({
    workflows,
    triggers,
    ...args
  }: ScheduleWorkflowRemindersArgs & { triggers: WorkflowTriggerEvents[] }) {
    if (workflows.length <= 0) return;
    await scheduleWorkflowReminders({
      ...args,
      workflows: workflows.filter((workflow) => triggers.includes(workflow.trigger)),
    });
  }

  static async scheduleLazyEmailWorkflow({
    workflowTriggerEvent,
    workflowStepId,
    workflow,
    evt,
    seatReferenceId,
  }: {
    // TODO: Expand this method to other workflow triggers
    workflowTriggerEvent: "BEFORE_EVENT" | "AFTER_EVENT";
    workflowStepId: number;
    workflow: Pick<Workflow, "time" | "timeUnit">;
    evt: Pick<CalendarEvent, "uid" | "startTime" | "endTime">;
    seatReferenceId?: string;
  }) {
    const { uid: bookingUid } = evt;
    const log = logger.getSubLogger({
      prefix: [`[WorkflowService.scheduleLazyEmailReminder]: bookingUid ${bookingUid}`],
    });

    if (!bookingUid) {
      log.error(`Missing bookingUid`);
      return;
    }

    const scheduledDate = WorkflowService.processWorkflowScheduledDate({
      time: workflow.time,
      timeUnit: workflow.timeUnit,
      workflowTriggerEvent,
      evt,
      ...(seatReferenceId && { seatReferenceId }),
    });

    if (!scheduledDate) {
      log.error("No scheduled date processed");
      return;
    }

    let workflowReminder: { id: number | null; uuid: string | null };
    try {
      const workflowReminderRepository = new WorkflowReminderRepository(prisma);
      workflowReminder = await workflowReminderRepository.create({
        bookingUid,
        workflowStepId,
        method: WorkflowMethods.EMAIL,
        scheduledDate,
        scheduled: true,
        seatReferenceUid: seatReferenceId,
      });
    } catch (error) {
      log.error(`Error creating workflowReminder: ${error}`);
      return;
    }

    if (!workflowReminder.id || !workflowReminder.uuid) {
      log.error(`WorkflowReminder does not contain uuid`);
      return;
    }

    const taskerPayload = {
      bookingUid,
      workflowReminderId: workflowReminder.id,
    };

    await tasker.create("sendWorkflowEmails", taskerPayload, {
      scheduledAt: scheduledDate,
      referenceUid: workflowReminder.uuid,
    });
  }
  static processWorkflowScheduledDate({
    workflowTriggerEvent,
    time,
    timeUnit,
    evt,
  }: {
    workflowTriggerEvent: WorkflowTriggerEvents;
    time: number | null;
    timeUnit: TimeUnit | null;
    evt: Pick<CalendarEvent, "startTime" | "endTime">;
  }) {
    const { startTime, endTime } = evt;
    const processedTimeUnit: timeUnitLowerCase | undefined =
      timeUnit?.toLocaleLowerCase() as timeUnitLowerCase;

    let scheduledDate = null;

    if (workflowTriggerEvent === WorkflowTriggerEvents.BEFORE_EVENT) {
      scheduledDate =
        time && processedTimeUnit ? dayjs(startTime).subtract(time, processedTimeUnit).toDate() : null;
    } else if (workflowTriggerEvent === WorkflowTriggerEvents.AFTER_EVENT) {
      scheduledDate = time && processedTimeUnit ? dayjs(endTime).add(time, processedTimeUnit).toDate() : null;
    }

    return scheduledDate;
  }

  static generateCommonScheduleFunctionParams({
    workflow,
    workflowStep,
    seatReferenceUid,
    creditCheckFn,
  }: {
    workflow: Omit<Workflow, "steps">;
    workflowStep: WorkflowStep;
    seatReferenceUid: string | undefined;
    creditCheckFn: CreditCheckFn;
  }) {
    return {
      triggerEvent: workflow.trigger,
      timeSpan: {
        time: workflow.time,
        timeUnit: workflow.timeUnit,
      },
      workflowStepId: workflowStep.id,
      template: workflowStep.template,
      userId: workflow.userId,
      teamId: workflow.teamId,
      seatReferenceUid,
      verifiedAt: workflowStep.verifiedAt || null,
      creditCheckFn,
    };
  }
}
