import type { EventStatus } from "ics";

import dayjs from "@calcom/dayjs";
import generateIcsString, { ICSCalendarEvent } from "@calcom/emails/lib/generateIcsString";
import { sendCustomWorkflowEmail } from "@calcom/emails/workflow-email-service";
import type { BookingSeatRepository } from "@calcom/features/bookings/repositories/BookingSeatRepository";
import type { WorkflowStep } from "@calcom/features/ee/workflows/lib/types";
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
import { Person, RecurringEvent, TeamMember } from "@calcom/types/Calendar";

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
    evt: {
      uid?: string | null;
      type?: string;
      startTime: string;
      endTime: string;
      organizer: Person;
      attendees: AttendeeInBookingInfo[];
      location?: string | null;
      schedulingType?: SchedulingType | null;
      team?: {
        name: string;
        members: TeamMember[];
        id: number;
      };
      responses?: BookingInfo["responses"];
      customReplyToEmail?: string | null;
      bookerUrl?: string;
      title: BookingInfo["title"];
      hideOrganizerEmail?: BookingInfo["hideOrganizerEmail"];
      iCalUID?: string | null;
      iCalSequence?: number | null;
      recurringEvent?: RecurringEvent | null;
      cancellationReason?: string | null;
      rescheduleReason?: string | null;
      hideCalendarEventDetails?: boolean;
      additionalNotes?: string | null;
      metadata?: BookingInfo["metadata"];
    };
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
      isFormTrigger: !evt,
      bookerUrl: evt?.bookerUrl,
      bookingUid: evt?.uid || undefined,
      organizerEmail: evt.organizer?.email || "",
      teamMemberEmails: evt.team?.members?.map((member) => member.email) || [],
      attendeeEmails: evt.attendees?.map((attendee) => attendee.email) || [],
      schedulingType: evt?.schedulingType,
      workflowUserId: workflow.userId,
      sendToEmail: workflowReminder.workflowStep.sendTo || undefined,
      formData: undefined,
      workflowStep: workflowReminder.workflowStep as WorkflowStep & { action: ScheduleEmailReminderAction },
      emailAttendeeSendToOverride,
      hideBranding,
    });

    const emailWorkflowContent = await this.generateEmailPayloadForEvtWorkflow({
      ...emailWorkflowContentParams,
      eventTypeSlug: evt.type || undefined,
      team: evt.team,
      responses: evt.responses,
      metaVideoCallUrl: bookingMetadataSchema.parse(evt.metadata || {})?.videoCallUrl,
      location: evt.location,
      customReplyToEmail: evt.customReplyToEmail,
      cancellationReason: evt.cancellationReason ?? "",
      rescheduleReason: evt.rescheduleReason ?? "",
      hideOrganizerEmail: evt.hideOrganizerEmail,
      hideCalendarEventDetails: evt.hideCalendarEventDetails,
      recurringEvent: evt.recurringEvent,
      attendees: evt.attendees,
      bookerUrl: evt.bookerUrl || WEBSITE_URL,
      additionalNotes: evt.additionalNotes,
      iCalSequence: evt.iCalSequence,
      iCalUID: evt.iCalUID,
      title: evt.title,
      startTime: evt.startTime,
      endTime: evt.endTime,
      organizer: evt.organizer,
      meetingUrl:
        getVideoCallUrlFromCalEvent(evt) || bookingMetadataSchema.parse(evt.metadata || {})?.videoCallUrl,
      bookingUid: evt.uid ?? "",
      triggerEvent: commonScheduleFunctionParams.triggerEvent,
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
    attendeeEmails,
    bookerUrl,
    bookingUid,
    emailAttendeeSendToOverride,
    formData,
    hideBranding,
    isFormTrigger = false,
    organizerEmail,
    schedulingType,
    sendToEmail,
    teamMemberEmails,
    workflowStep,
    workflowUserId,
  }: {
    isFormTrigger: boolean;
    bookerUrl?: string;
    bookingUid?: string;
    sendToEmail?: string;
    organizerEmail: string;
    teamMemberEmails: string[];
    attendeeEmails: string[];
    schedulingType?: SchedulingType | null;
    workflowStep: Pick<
      WorkflowStep,
      "id" | "action" | "reminderBody" | "emailSubject" | "sender" | "includeCalendarEvent" | "verifiedAt"
    >;
    workflowUserId: number | null;
    emailAttendeeSendToOverride?: string | null;
    formData?: FormSubmissionData;
    hideBranding?: boolean;
  }) {
    if (!workflowStep.verifiedAt) {
      throw new Error(`Workflow step ${workflowStep.id} is not verified`);
    }

    if (!isEmailAction(workflowStep.action)) {
      throw new Error(`Non-email workflow step passed for booking ${bookingUid}`);
    }
    let sendTo: string[] = [];

    switch (workflowStep.action) {
      case WorkflowActions.EMAIL_ADDRESS:
        sendTo = [sendToEmail || ""];
        break;
      case WorkflowActions.EMAIL_HOST: {
        if (isFormTrigger) {
          throw new Error("EMAIL_HOST is not supported for form triggers");
        }
        sendTo = [organizerEmail || ""];

        const isTeamEvent =
          schedulingType === SchedulingType.ROUND_ROBIN || schedulingType === SchedulingType.COLLECTIVE;
        if (isTeamEvent && teamMemberEmails.length > 0) {
          sendTo = sendTo.concat(teamMemberEmails);
        }
        break;
      }
      case WorkflowActions.EMAIL_ATTENDEE:
        if (!isFormTrigger) {
          const attendees = emailAttendeeSendToOverride ? [emailAttendeeSendToOverride] : attendeeEmails;

          const limitGuestsDate = new Date("2025-01-13");

          if (workflowUserId) {
            const userRepository = new UserRepository(prisma);
            const user = await userRepository.findById({ id: workflowUserId });
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
    if (!isFormTrigger && typeof bookerUrl !== "string") {
      throw new Error("bookerUrl not a part of the evt");
    }

    if (isFormTrigger && !formData) {
      throw new Error("Either evt or formData must be provided");
    }

    return {
      action: workflowStep.action,
      sendTo,
      emailSubject: workflowStep.emailSubject || "",
      emailBody: workflowStep.reminderBody || "",
      sender: workflowStep.sender || SENDER_NAME,
      hideBranding,
      includeCalendarEvent: workflowStep.includeCalendarEvent,
      verifiedAt: workflowStep.verifiedAt,
    } as const;
  }

  async generateEmailPayloadForEvtWorkflow({
    attendees,
    additionalNotes,
    metaVideoCallUrl,
    team,
    responses,
    location,
    eventTypeSlug,
    customReplyToEmail,
    cancellationReason,
    rescheduleReason,
    hideOrganizerEmail,
    hideCalendarEventDetails,
    recurringEvent,
    iCalSequence,
    iCalUID,
    title,
    bookingUid,
    meetingUrl,
    startTime,
    endTime,
    organizer,
    bookerUrl = WEBSITE_URL,
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
    eventTypeSlug?: string;
    team?: {
      name: string;
      members: TeamMember[];
      id: number;
    };
    responses?: BookingInfo["responses"];
    metaVideoCallUrl?: string;
    location?: string | null;
    cancellationReason?: string;
    rescheduleReason?: string;
    customReplyToEmail?: string | null;
    title: BookingInfo["title"];
    hideOrganizerEmail?: BookingInfo["hideOrganizerEmail"];
    hideCalendarEventDetails?: boolean;
    iCalUID?: string | null;
    iCalSequence?: number | null;
    recurringEvent?: RecurringEvent | null;
    additionalNotes?: string | null;
    attendees: BookingInfo["attendees"];
    bookerUrl: string;
    startTime: BookingInfo["startTime"];
    organizer: BookingInfo["organizer"];
    endTime: BookingInfo["endTime"];
    meetingUrl?: string;
    bookingUid?: string;
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
      prefix: [`[generateEmailPayloadForEvtWorkflow]: bookingUid: ${bookingUid || "N/A"}`],
    });

    let attendeeToBeUsedInMail: AttendeeInBookingInfo | null = null;
    let name = "";
    let attendeeName = "";
    let timeZone = "";

    switch (action) {
      case WorkflowActions.EMAIL_ADDRESS:
        name = "";
        attendeeToBeUsedInMail = attendees[0];
        attendeeName = attendees[0].name;
        timeZone = organizer.timeZone;
        break;
      case WorkflowActions.EMAIL_HOST:
        attendeeToBeUsedInMail = attendees[0];
        name = organizer.name;
        attendeeName = attendeeToBeUsedInMail.name;
        timeZone = organizer.timeZone;
        break;
      case WorkflowActions.EMAIL_ATTENDEE: {
        // check if first attendee of sendTo is present in the attendees list, if not take the evt attendee
        const attendeeEmailToBeUsedInMailFromEvt = attendees.find((attendee) => attendee.email === sendTo[0]);
        attendeeToBeUsedInMail = attendeeEmailToBeUsedInMailFromEvt
          ? attendeeEmailToBeUsedInMailFromEvt
          : attendees[0];
        name = attendeeToBeUsedInMail.name;
        attendeeName = organizer.name;
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

    if (emailBody) {
      const isEmailAttendeeAction = action === WorkflowActions.EMAIL_ATTENDEE;
      const recipientEmail = getWorkflowRecipientEmail({
        action,
        attendeeEmail: attendeeToBeUsedInMail.email,
        organizerEmail: organizer.email,
        sendToEmail: sendTo[0],
      });

      const variables: VariablesType = {
        eventName: title || "",
        organizerName: organizer.name,
        attendeeName: attendeeToBeUsedInMail.name,
        attendeeFirstName: attendeeToBeUsedInMail.firstName,
        attendeeLastName: attendeeToBeUsedInMail.lastName,
        attendeeEmail: attendeeToBeUsedInMail.email,
        eventDate: dayjs(startTime).tz(timeZone),
        eventEndTime: dayjs(endTime).tz(timeZone),
        timeZone: timeZone,
        location: location,
        additionalNotes: additionalNotes,
        responses: transformBookingResponsesToVariableFormat(responses),
        meetingUrl,
        cancelLink: `${bookerUrl}/booking/${bookingUid}?cancel=true${
          recipientEmail ? `&cancelledBy=${encodeURIComponent(recipientEmail)}` : ""
        }${isEmailAttendeeAction && seatReferenceUid ? `&seatReferenceUid=${seatReferenceUid}` : ""}`,
        cancelReason: cancellationReason,
        rescheduleLink: `${bookerUrl}/reschedule/${bookingUid}${
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

        rescheduleReason: rescheduleReason,
        ratingUrl: `${bookerUrl}/booking/${bookingUid}?rating`,
        noShowUrl: `${bookerUrl}/booking/${bookingUid}?noShow=true`,
        attendeeTimezone: attendees[0].timeZone,
        eventTimeInAttendeeTimezone: dayjs(startTime).tz(attendees[0].timeZone),
        eventEndTimeInAttendeeTimezone: dayjs(endTime).tz(attendees[0].timeZone),
      };

      const locale = isEmailAttendeeAction
        ? attendeeToBeUsedInMail.language?.locale
        : organizer.language.locale;

      const emailSubjectTemplate = customTemplate(emailSubject, variables, locale, organizer.timeFormat);
      emailContent.emailSubject = emailSubjectTemplate.text;
      emailContent.emailBody = customTemplate(
        emailBody,
        variables,
        locale,
        organizer.timeFormat,
        hideBranding
      ).html;
    } else if (template === WorkflowTemplates.REMINDER) {
      emailContent = emailReminderTemplate({
        isEditingMode: false,
        locale: organizer.language.locale,
        t: await getTranslation(organizer.language.locale || "en", "common"),
        action,
        timeFormat: organizer.timeFormat,
        startTime,
        endTime,
        eventName: title,
        timeZone,
        location: location || "",
        meetingUrl: meetingUrl,
        otherPerson: attendeeName,
        name,
      });
    } else if (template === WorkflowTemplates.RATING) {
      emailContent = emailRatingTemplate({
        isEditingMode: true,
        locale: organizer.language.locale,
        action,
        t: await getTranslation(organizer.language.locale || "en", "common"),
        timeFormat: organizer.timeFormat,
        startTime,
        endTime,
        eventName: title,
        timeZone,
        organizer: organizer.name,
        name,
        ratingUrl: `${bookerUrl}/booking/${bookingUid}?rating`,
        noShowUrl: `${bookerUrl}/booking/${bookingUid}?noShow=true`,
      });
    }

    // Allows debugging generated email content without waiting for sendgrid to send emails
    log.debug(`Sending Email for trigger ${triggerEvent}`, JSON.stringify(emailContent));

    const status: EventStatus =
      triggerEvent === WorkflowTriggerEvents.EVENT_CANCELLED ? "CANCELLED" : "CONFIRMED";

    const organizerT = await getTranslation(organizer.language.locale || "en", "common");

    const processedAttendees = await Promise.all(
      attendees.map(async (attendee) => {
        const attendeeT = await getTranslation(attendee.language.locale || "en", "common");
        return {
          ...attendee,
          name: preprocessNameFieldDataWithVariant("fullName", attendee.name) as string,
          language: { ...attendee.language, translate: attendeeT },
        };
      })
    );

    const emailEvent = {
      type: eventTypeSlug || "",
      organizer: { ...organizer, language: { ...organizer.language, translate: organizerT } },
      attendees: processedAttendees,
      location: metaVideoCallUrl || location,
      startTime,
      endTime,
      title,
      uid: bookingUid || "",
      hideOrganizerEmail,
      team,
      iCalUID,
      iCalSequence,
      recurringEvent,
      hideCalendarEventDetails,
    } satisfies ICSCalendarEvent;

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
      ...(!hideOrganizerEmail && {
        replyTo: customReplyToEmail || organizer.email,
      }),
      attachments,
      sender,
    };
  }
}
