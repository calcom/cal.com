import type { BookingSeatRepository } from "@calcom/features/bookings/repositories/BookingSeatRepository";
import type { Workflow, WorkflowStep, WorkflowReminder } from "@calcom/features/ee/workflows/lib/types";
import { getSubmitterEmail } from "@calcom/features/tasker/tasks/triggerFormSubmittedNoEvent/formSubmissionValidation";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { prisma } from "@calcom/prisma";
import { WorkflowActions, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { SchedulingType } from "@calcom/prisma/enums";
import { CalendarEvent } from "@calcom/types/Calendar";

import type { WorkflowReminderRepository } from "../../repositories/WorkflowReminderRepository";
import type { FormSubmissionData } from "../types";
import { WorkflowService } from "./WorkflowService";

export class EmailWorkflowService {
  constructor(
    private workflowReminderRepository: WorkflowReminderRepository,
    private bookingSeatRepository: BookingSeatRepository
  ) {}

  async handleSendEmailWorkflowTask({
    evt,
    workflowReminderId,
  }: {
    evt: CalendarEvent;
    workflowReminderId: number;
  }) {
    const workflowReminder = await this.workflowReminderRepository.findByIdIncludeStepAndWorkflow(
      workflowReminderId
    );

    if (!workflowReminder) {
      throw new Error(`Workflow reminder not found with id ${workflowReminderId}`);
    }

    if (!workflowReminder.workflowStep) {
      throw new Error(`Workflow step not found on reminder with id ${workflowReminderId}`);
    }

    let emailAttendeeSendToOverride: string | null = null;
    if (workflowReminder.seatReferenceId) {
      const seatAttendee = await this.bookingSeatRepository.getByUidIncludeAttendee(
        workflowReminder.seatReferenceId
      );
      emailAttendeeSendToOverride = seatAttendee?.attendee.email || null;
    }

    const buildEmailWorkflowContentParams = this.generateParametersToBuildEmailWorkflowContent({
      evt,
      workflowStep: workflowReminder.workflowStep,
      workflow: workflowReminder.workflowStep.workflow,
      emailAttendeeSendToOverride,
    });
  }

  async generateParametersToBuildEmailWorkflowContent({
    evt,
    workflowStep,
    workflow,
    emailAttendeeSendToOverride,
    formData,
  }: {
    evt: CalendarEvent;
    workflowStep: Pick<WorkflowStep, "action" | "sendTo" | "emailSubject" | "reminderBody" | "sender">;
    workflow: Pick<Workflow, "userId">;
    emailAttendeeSendToOverride: string | null;
    formData?: FormSubmissionData;
  }) {
    let sendTo: string[] = [];

    switch (workflowStep.action) {
      case WorkflowActions.EMAIL_ADDRESS:
        sendTo = [workflowStep.sendTo || ""];
        break;
      case WorkflowActions.EMAIL_HOST: {
        if (!evt) {
          // EMAIL_HOST is not supported for form triggers
          return;
        }

        sendTo = [evt.organizer?.email || ""];

        const schedulingType = evt.schedulingType;
        const isTeamEvent =
          schedulingType === SchedulingType.ROUND_ROBIN || schedulingType === SchedulingType.COLLECTIVE;
        if (isTeamEvent && evt.team?.members) {
          sendTo = sendTo.concat(evt.team.members.map((member) => member.email));
        }
        break;
      }
      case WorkflowActions.EMAIL_ATTENDEE:
        if (evt) {
          const attendees = emailAttendeeSendToOverride
            ? [emailAttendeeSendToOverride]
            : evt.attendees?.map((attendee) => attendee.email);

          const limitGuestsDate = new Date("2025-01-13");

          if (workflow.userId) {
            const userRepository = new UserRepository(prisma);
            const user = await userRepository.findById({ id: workflow.userId });
            if (user?.createdDate && user.createdDate > limitGuestsDate) {
              sendTo = attendees.slice(0, 1);
            } else {
              sendTo = attendees;
            }
          } else {
            sendTo = attendees;
          }
        }

        if (formData) {
          const submitterEmail = getSubmitterEmail(formData.responses);
          if (submitterEmail) {
            sendTo = [submitterEmail];
          }
        }
    }

    const commonScheduleFunctionParams = WorkflowService.generateCommonScheduleFunctionParams({
      workflow,
    });

    return {
      ...scheduleFunctionParams,
      action: workflowStep.action,
      sendTo,
      emailSubject: workflowStep.emailSubject || "",
      emailBody: workflowStep.reminderBody || "",
      sender: workflowStep.sender || SENDER_NAME,
      hideBranding,
      includeCalendarEvent: step.includeCalendarEvent,
      ...contextData,
      verifiedAt: step.verifiedAt,
    } as const;
  }
}
