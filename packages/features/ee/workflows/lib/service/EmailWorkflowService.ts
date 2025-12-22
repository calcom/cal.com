import type { EventStatus } from "ics";

import dayjs from "@calcom/dayjs";
import generateIcsString from "@calcom/emails/lib/generateIcsString";
import { sendCustomWorkflowEmail } from "@calcom/emails/workflow-email-service";
import type { BookingSeatRepository } from "@calcom/features/bookings/repositories/BookingSeatRepository";
import type { Workflow, WorkflowStep } from "@calcom/features/ee/workflows/lib/types";
import { preprocessNameFieldDataWithVariant } from "@calcom/features/form-builder/utils";
import { getHideBranding } from "@calcom/features/profile/lib/hideBranding";
import { getSubmitterEmail } from "@calcom/features/tasker/tasks/triggerFormSubmittedNoEvent/formSubmissionValidation";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import { SENDER_NAME, WEBSITE_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import { WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";
import { SchedulingType, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import { CalendarEvent } from "@calcom/types/Calendar";

import type { WorkflowReminderRepository } from "../../repositories/WorkflowReminderRepository";
import { isEmailAction } from "../actionHelperFunctions";
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

    if (!workflowReminder.workflowStep) {
      throw new Error(`Workflow step not found on reminder with id ${workflowReminderId}`);
    }

    if (!workflowReminder.workflowStep.verifiedAt) {
      throw new Error(`Workflow step id ${workflowReminder.workflowStep.id} is not verified`);
    }

    const workflow = workflowReminder.workflowStep.workflow;

    let emailAttendeeSendToOverride: string | null = null;
    if (workflowReminder.seatReferenceId) {
      const seatAttendee = await this.bookingSeatRepository.getByUidIncludeAttendee(
        workflowReminder.seatReferenceId
      );
      emailAttendeeSendToOverride = seatAttendee?.attendee.email || null;
    }
    const { CreditService } = await import("@calcom/features/ee/billing/credit-service");
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

    const results = await Promise.allSettled(
      emailWorkflowContentParams.sendTo.map((email) => {
        return sendCustomWorkflowEmail({
          to: email,
          ...emailWorkflowContent,
        });
      })
    );

    const failedEmails = results
      .map((result, index) => ({
        result,
        email: emailWorkflowContentParams.sendTo[index],
      }))
      .filter(({ result }) => result.status === "rejected");

    if (failedEmails.length > 0) {
      console.error(
        "Failed to send workflow emails:",
        failedEmails.map(({ email, result }) => ({
          email,
          reason: result.status === "rejected" ? result.reason : undefined,
        }))
      );
    }
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
    if (!workflowStep.verifiedAt) {
      throw new Error(`Workflow step ${workflowStep.id} is not verified`);
    }

    if (!isEmailAction(workflowStep.action)) {
      throw new Error(`Non-email workflow step passed for booking ${evt?.uid}`);
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

    // Only check for bookerUrl when evt is provided (not for form submissions)
    if (evt && typeof evt.bookerUrl !== "string") {
      throw new Error("bookerUrl not a part of the evt");
    }

    if (!evt && !formData) {
      throw new Error("Either evt or formData must be provided");
    }

    const contextData: WorkflowContextData = evt
      ? { evt: evt as BookingInfo }
      : { formData: formData as FormSubmissionData };
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
      const meetingUrl =
        getVideoCallUrlFromCalEvent(evt) || bookingMetadataSchema.parse(evt.metadata || {})?.videoCallUrl;
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
        meetingUrl,
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
        meetingUrl:
          evt.videoCallData?.url || bookingMetadataSchema.parse(evt.metadata || {})?.videoCallUrl || "",
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

    const processedAttendees = await Promise.all(
      evt.attendees.map(async (attendee) => {
        const attendeeT = await getTranslation(attendee.language.locale || "en", "common");
        return {
          ...attendee,
          name: preprocessNameFieldDataWithVariant("fullName", attendee.name) as string,
          language: { ...attendee.language, translate: attendeeT },
        };
      })
    );

    const emailEvent = {
      ...evt,
      type: evt.eventType?.slug || "",
      organizer: { ...evt.organizer, language: { ...evt.organizer.language, translate: organizerT } },
      attendees: processedAttendees,
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

    const customReplyToEmail =
      evt?.eventType?.customReplyToEmail || (evt as CalendarEvent).customReplyToEmail;

    return {
      subject: emailContent.emailSubject,
      html: emailContent.emailBody,
      ...(!evt.hideOrganizerEmail && {
        replyTo: customReplyToEmail || evt.organizer.email,
      }),
      attachments,
      sender,
    };
  }
}
