import type { EventStatus } from "ics";

import dayjs from "@calcom/dayjs";
import generateIcsString from "@calcom/emails/lib/generateIcsString";
import { sendCustomWorkflowEmail } from "@calcom/emails/workflow-email-service";
import type { BookingSeatRepository } from "@calcom/features/bookings/repositories/BookingSeatRepository";
import { CreditService } from "@calcom/features/ee/billing/credit-service";
import type { Workflow, WorkflowStep } from "@calcom/features/ee/workflows/lib/types";
import { preprocessNameFieldDataWithVariant } from "@calcom/features/form-builder/utils";
import { getHideBranding } from "@calcom/features/profile/lib/hideBranding";
import { getSubmitterEmail } from "@calcom/features/tasker/tasks/triggerFormSubmittedNoEvent/formSubmissionValidation";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { SENDER_NAME, WEBSITE_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import { WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";
import { SchedulingType, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import { CalendarEvent } from "@calcom/types/Calendar";

import type { WorkflowReminderRepository } from "../../repositories/WorkflowReminderRepository";
import { getWorkflowRecipientEmail } from "../getWorkflowReminders";
import type { VariablesType } from "../reminders/templates/customTemplate";
import customTemplate, {
  transformBookingResponsesToVariableFormat,
} from "../reminders/templates/customTemplate";
import emailRatingTemplate from "../reminders/templates/emailRatingTemplate";
import emailReminderTemplate from "../reminders/templates/emailReminderTemplate";
import type {
  FormSubmissionData,
  WorkflowContextData,
  AttendeeInBookingInfo,
  BookingInfo,
  ScheduleEmailReminderAction,
} from "../types";
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
    if (!workflowReminder?.workflowStep?.verifiedAt) {
      throw new Error(`Workflow step id ${workflowReminder.id} is not verified`);
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

    const emailWorkflowContentParams = await this.generateParametersToBuildEmailWorkflowContent({
      evt,
      workflowStep: workflowReminder.workflowStep as WorkflowStep & { action: ScheduleEmailReminderAction },
      workflow: workflowReminder.workflowStep.workflow,
      emailAttendeeSendToOverride,
      commonScheduleFunctionParams,
      hideBranding,
    });

    const emailWorkflowContent = await this.generateEmailPayloadForEvtWorkflow({
      ...emailWorkflowContentParams,
      evt: evt as BookingInfo,
      action: workflowReminder.workflowStep.action as ScheduleEmailReminderAction,
      template: workflowReminder.workflowStep.template,
      includeCalendarEvent: workflowReminder.workflowStep.includeCalendarEvent,
    });

    await Promise.all(
      emailWorkflowContentParams.sendTo.map((email) => {
        sendCustomWorkflowEmail({
          to: email,
          ...emailWorkflowContent,
        });
      })
    );
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
    workflowStep: WorkflowStep & { action: ScheduleEmailReminderAction };
    workflow: Pick<Workflow, "userId">;
    emailAttendeeSendToOverride?: string | null;
    formData?: FormSubmissionData;
    commonScheduleFunctionParams: ReturnType<typeof WorkflowService.generateCommonScheduleFunctionParams>;
    hideBranding?: boolean;
  }) {
    if (!workflowStep.verifiedAt) {
      throw new Error();
    }
    let sendTo: string[] = [];

    switch (workflowStep.action) {
      case WorkflowActions.EMAIL_ADDRESS:
        sendTo = [workflowStep.sendTo || ""];
        break;
      case WorkflowActions.EMAIL_HOST: {
        if (!evt) {
          throw new Error("EMAIL_HOST is not supported for form triggers");
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

  async generateEmailPayloadForEvtWorkflow({
    evt,
    sendTo,
    seatReferenceUid,
    hideBranding,
    emailSubject,
    emailBody,
    sender,
    action,
    template,
    includeCalendarEvent,
    triggerEvent,
  }: {
    evt: BookingInfo;
    sendTo: string[];
    seatReferenceUid?: string;
    hideBranding?: boolean;
    emailSubject: string;
    emailBody: string;
    sender: string;
    action: ScheduleEmailReminderAction;
    template?: WorkflowTemplates;
    includeCalendarEvent?: boolean;
    triggerEvent: WorkflowTriggerEvents;
  }) {
    const log = logger.getSubLogger({
      prefix: [`[generateEmailPayloadForEvtWorkflow]: bookingUid: ${evt?.uid}`],
    });
    const { startTime, endTime } = evt;

    let attendeeToBeUsedInMail: AttendeeInBookingInfo | null = null;
    let name = "";
    let attendeeName = "";
    let timeZone = "";

    switch (action) {
      case WorkflowActions.EMAIL_ADDRESS:
        name = "";
        attendeeToBeUsedInMail = evt.attendees[0];
        attendeeName = evt.attendees[0].name;
        timeZone = evt.organizer.timeZone;
        break;
      case WorkflowActions.EMAIL_HOST:
        attendeeToBeUsedInMail = evt.attendees[0];
        name = evt.organizer.name;
        attendeeName = attendeeToBeUsedInMail.name;
        timeZone = evt.organizer.timeZone;
        break;
      case WorkflowActions.EMAIL_ATTENDEE: {
        // check if first attendee of sendTo is present in the attendees list, if not take the evt attendee
        const attendeeEmailToBeUsedInMailFromEvt = evt.attendees.find(
          (attendee) => attendee.email === sendTo[0]
        );
        attendeeToBeUsedInMail = attendeeEmailToBeUsedInMailFromEvt
          ? attendeeEmailToBeUsedInMailFromEvt
          : evt.attendees[0];
        name = attendeeToBeUsedInMail.name;
        attendeeName = evt.organizer.name;
        timeZone = attendeeToBeUsedInMail.timeZone;
        break;
      }
    }

    if (!attendeeToBeUsedInMail) {
      throw new Error("Failed to determine attendee email");
    }

    let emailContent = {
      emailSubject,
      emailBody: `<body style="white-space: pre-wrap;">${emailBody}</body>`,
    };
    const bookerUrl = evt.bookerUrl ?? WEBSITE_URL;

    if (emailBody) {
      const isEmailAttendeeAction = action === WorkflowActions.EMAIL_ATTENDEE;
      const recipientEmail = getWorkflowRecipientEmail({
        action,
        attendeeEmail: attendeeToBeUsedInMail.email,
        organizerEmail: evt.organizer.email,
        sendToEmail: sendTo[0],
      });
      const variables: VariablesType = {
        eventName: evt.title || "",
        organizerName: evt.organizer.name,
        attendeeName: attendeeToBeUsedInMail.name,
        attendeeFirstName: attendeeToBeUsedInMail.firstName,
        attendeeLastName: attendeeToBeUsedInMail.lastName,
        attendeeEmail: attendeeToBeUsedInMail.email,
        eventDate: dayjs(startTime).tz(timeZone),
        eventEndTime: dayjs(endTime).tz(timeZone),
        timeZone: timeZone,
        location: evt.location,
        additionalNotes: evt.additionalNotes,
        responses: transformBookingResponsesToVariableFormat(evt.responses),
        meetingUrl: bookingMetadataSchema.parse(evt.metadata || {})?.videoCallUrl,
        cancelLink: `${bookerUrl}/booking/${evt.uid}?cancel=true${
          recipientEmail ? `&cancelledBy=${encodeURIComponent(recipientEmail)}` : ""
        }${isEmailAttendeeAction && seatReferenceUid ? `&seatReferenceUid=${seatReferenceUid}` : ""}`,
        cancelReason: evt.cancellationReason,
        rescheduleLink: `${bookerUrl}/reschedule/${evt.uid}${
          recipientEmail
            ? `?rescheduledBy=${encodeURIComponent(recipientEmail)}${
                isEmailAttendeeAction && seatReferenceUid
                  ? `&seatReferenceUid=${encodeURIComponent(seatReferenceUid)}`
                  : ""
              }`
            : isEmailAttendeeAction && seatReferenceUid
            ? `?seatReferenceUid=${encodeURIComponent(seatReferenceUid)}`
            : ""
        }`,

        rescheduleReason: evt.rescheduleReason,
        ratingUrl: `${bookerUrl}/booking/${evt.uid}?rating`,
        noShowUrl: `${bookerUrl}/booking/${evt.uid}?noShow=true`,
        attendeeTimezone: evt.attendees[0].timeZone,
        eventTimeInAttendeeTimezone: dayjs(startTime).tz(evt.attendees[0].timeZone),
        eventEndTimeInAttendeeTimezone: dayjs(endTime).tz(evt.attendees[0].timeZone),
      };

      const locale = isEmailAttendeeAction
        ? attendeeToBeUsedInMail.language?.locale
        : evt.organizer.language.locale;

      const emailSubjectTemplate = customTemplate(emailSubject, variables, locale, evt.organizer.timeFormat);
      emailContent.emailSubject = emailSubjectTemplate.text;
      emailContent.emailBody = customTemplate(
        emailBody,
        variables,
        locale,
        evt.organizer.timeFormat,
        hideBranding
      ).html;
    } else if (template === WorkflowTemplates.REMINDER) {
      emailContent = emailReminderTemplate({
        isEditingMode: false,
        locale: evt.organizer.language.locale,
        t: await getTranslation(evt.organizer.language.locale || "en", "common"),
        action,
        timeFormat: evt.organizer.timeFormat,
        startTime,
        endTime,
        eventName: evt.title,
        timeZone,
        location: evt.location || "",
        meetingUrl: bookingMetadataSchema.parse(evt.metadata || {})?.videoCallUrl || "",
        otherPerson: attendeeName,
        name,
      });
    } else if (template === WorkflowTemplates.RATING) {
      emailContent = emailRatingTemplate({
        isEditingMode: true,
        locale: evt.organizer.language.locale,
        action,
        t: await getTranslation(evt.organizer.language.locale || "en", "common"),
        timeFormat: evt.organizer.timeFormat,
        startTime,
        endTime,
        eventName: evt.title,
        timeZone,
        organizer: evt.organizer.name,
        name,
        ratingUrl: `${bookerUrl}/booking/${evt.uid}?rating`,
        noShowUrl: `${bookerUrl}/booking/${evt.uid}?noShow=true`,
      });
    }

    // Allows debugging generated email content without waiting for sendgrid to send emails
    log.debug(`Sending Email for trigger ${triggerEvent}`, JSON.stringify(emailContent));

    const status: EventStatus =
      triggerEvent === WorkflowTriggerEvents.EVENT_CANCELLED ? "CANCELLED" : "CONFIRMED";

    const organizerT = await getTranslation(evt.organizer.language.locale || "en", "common");

    const attendeeT = await getTranslation(evt.attendees[0].language.locale || "en", "common");

    const attendee = {
      ...evt.attendees[0],
      name: preprocessNameFieldDataWithVariant("fullName", evt.attendees[0].name) as string,
      language: { ...evt.attendees[0].language, translate: attendeeT },
    };

    const emailEvent = {
      ...evt,
      type: evt.eventType?.slug || "",
      organizer: { ...evt.organizer, language: { ...evt.organizer.language, translate: organizerT } },
      attendees: [attendee],
      location: bookingMetadataSchema.parse(evt.metadata || {})?.videoCallUrl || evt.location,
    };

    const attachments = includeCalendarEvent
      ? [
          {
            content:
              generateIcsString({
                event: emailEvent,
                status,
              }) || "",
            filename: "event.ics",
            contentType: "text/calendar; charset=UTF-8; method=REQUEST",
            disposition: "attachment",
          },
        ]
      : undefined;

    return {
      subject: emailContent.emailSubject,
      html: emailContent.emailBody,
      ...(!evt.hideOrganizerEmail && {
        replyTo: evt?.eventType?.customReplyToEmail || evt.organizer.email,
      }),
      attachments,
      sender,
    };
  }
}
