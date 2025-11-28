import type { BookingSeatRepository } from "@calcom/features/bookings/repositories/BookingSeatRepository";
import { CreditService } from "@calcom/features/ee/billing/credit-service";
import type { Workflow, WorkflowStep } from "@calcom/features/ee/workflows/lib/types";
import { getHideBranding } from "@calcom/features/profile/lib/hideBranding";
import { getSubmitterEmail } from "@calcom/features/tasker/tasks/triggerFormSubmittedNoEvent/formSubmissionValidation";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { SENDER_NAME } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { WorkflowActions } from "@calcom/prisma/enums";
import { SchedulingType } from "@calcom/prisma/enums";
import { CalendarEvent } from "@calcom/types/Calendar";

import type { WorkflowReminderRepository } from "../../repositories/WorkflowReminderRepository";
import type { FormSubmissionData, WorkflowContextData } from "../types";
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

    const workflow = workflowReminder.workflowStep.workflow;

    let emailAttendeeSendToOverride: string | null = null;
    if (workflowReminder.seatReferenceId) {
      const seatAttendee = await this.bookingSeatRepository.getByUidIncludeAttendee(
        workflowReminder.seatReferenceId
      );
      emailAttendeeSendToOverride = seatAttendee?.attendee.email || null;
    }
    const creditService = new CreditService();
    const creditCheckFn = creditService.hasAvailableCredits.bind(creditService);

    const commonScheduleFunctionParams = WorkflowService.generateCommonScheduleFunctionParams({
      workflow: workflowReminder.workflowStep.workflow,
      workflowStep: workflowReminder.workflowStep,
      seatReferenceUid: workflowReminder.seatReferenceId || undefined,
      creditCheckFn,
    });

    const hideBranding = await getHideBranding({
      userId: workflow.userId ?? undefined,
      teamId: workflow.teamId ?? undefined,
    });

    const buildEmailWorkflowContentParams = this.generateParametersToBuildEmailWorkflowContent({
      evt,
      workflowStep: workflowReminder.workflowStep,
      workflow: workflowReminder.workflowStep.workflow,
      emailAttendeeSendToOverride,
      commonScheduleFunctionParams,
      hideBranding,
    });
  }

  async generateParametersToBuildEmailWorkflowContent({
    evt,
    workflowStep,
    workflow,
    emailAttendeeSendToOverride,
    formData,
    commonScheduleFunctionParams,
    hideBranding,
  }: {
    evt?: CalendarEvent;
    workflowStep: WorkflowStep;
    workflow: Pick<Workflow, "userId">;
    emailAttendeeSendToOverride?: string | null;
    formData?: FormSubmissionData;
    commonScheduleFunctionParams: ReturnType<typeof WorkflowService.generateCommonScheduleFunctionParams>;
    hideBranding?: boolean;
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

    // The evt builder already validates the bookerUrl exists
    if (!evt || typeof evt.bookerUrl !== "string") {
      throw new Error("bookerUrl not a part of the evt");
    }

    const contextData: WorkflowContextData = evt ? { evt } : { formData: formData as FormSubmissionData };
    return {
      ...commonScheduleFunctionParams,
      action: workflowStep.action,
      sendTo,
      emailSubject: workflowStep.emailSubject || "",
      emailBody: workflowStep.reminderBody || "",
      sender: workflowStep.sender || SENDER_NAME,
      hideBranding,
      includeCalendarEvent: workflowStep.includeCalendarEvent,
      ...contextData,
      verifiedAt: workflowStep.verifiedAt,
    } as const;
  }
}
