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
import {
  buildPlatformCancelLink,
  buildPlatformRescheduleLink,
  buildStandardCancelLink,
  buildStandardRescheduleLink,
} from "@calcom/lib/LinkBuilder";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import {
  SchedulingType,
  WorkflowActions,
  WorkflowTemplates,
  WorkflowTriggerEvents,
} from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { EventStatus } from "ics";
import type { WorkflowReminderRepository } from "../../repositories/WorkflowReminderRepository";
import {
  getTemplateBodyForAction,
  getTemplateSubjectForAction,
  isEmailAction,
} from "../actionHelperFunctions";
import { detectMatchedTemplate } from "../detectMatchedTemplate";
import { getWorkflowRecipientEmail } from "../getWorkflowReminders";
import type { VariablesType } from "../reminders/templates/customTemplate";
import customTemplate, {
  transformBookingResponsesToVariableFormat,
} from "../reminders/templates/customTemplate";
import emailRatingTemplate from "../reminders/templates/emailRatingTemplate";
import emailReminderTemplate from "../reminders/templates/emailReminderTemplate";
import { replaceCloakedLinksInHtml } from "../reminders/utils";
import type {
  AttendeeInBookingInfo,
  BookingInfo,
  FormSubmissionData,
  ScheduleEmailReminderAction,
  WorkflowContextData,
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
    const workflowReminder =
      await this.workflowReminderRepository.findByIdIncludeStepAndWorkflow(workflowReminderId);

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
      workflowStep: workflowReminder.workflowStep as WorkflowStep & {
        action: ScheduleEmailReminderAction;
      },
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
        // For seated events, get the correct attendee based on seatReferenceUid
        if (seatReferenceUid) {
          const seatAttendeeData =
            await this.bookingSeatRepository.getByReferenceUidWithAttendeeDetails(seatReferenceUid);
          if (seatAttendeeData?.attendee) {
            const nameParts = seatAttendeeData.attendee.name.split(" ").map((part: string) => part.trim());
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(" ");
            attendeeToBeUsedInMail = {
              name: seatAttendeeData.attendee.name,
              firstName,
              lastName: lastName || undefined,
              email: seatAttendeeData.attendee.email,
              phoneNumber: seatAttendeeData.attendee.phoneNumber || null,
              timeZone: seatAttendeeData.attendee.timeZone,
              language: { locale: seatAttendeeData.attendee.locale || "en" },
            };
          } else {
            // Fallback to first attendee if seat attendee not found
            attendeeToBeUsedInMail = evt.attendees[0];
          }
        } else {
          // For non-seated events, check if first attendee of sendTo is present in the attendees list, if not take the evt attendee
          const attendeeEmailToBeUsedInMailFromEvt = evt.attendees.find(
            (attendee) => attendee.email === sendTo[0]
          );
          attendeeToBeUsedInMail = attendeeEmailToBeUsedInMailFromEvt
            ? attendeeEmailToBeUsedInMailFromEvt
            : evt.attendees[0];
        }
        name = attendeeToBeUsedInMail.name;
        attendeeName = evt.organizer.name;
        timeZone = attendeeToBeUsedInMail.timeZone;
        break;
      }
    }

    if (!attendeeToBeUsedInMail) {
      throw new Error("Failed to determine attendee email");
    }

    const isEmailAttendeeAction = action === WorkflowActions.EMAIL_ATTENDEE;
    const locale = isEmailAttendeeAction
      ? attendeeToBeUsedInMail.language?.locale || "en"
      : evt.organizer.language.locale || "en";

    let emailContent = {
      emailSubject,
      emailBody: `<body style="white-space: pre-wrap;">${emailBody}</body>`,
    };
    const bookerUrl = evt.bookerUrl ?? WEBSITE_URL;

    // Detect if the email content matches a default template for locale-based regeneration
    const timeFormat = evt.organizer.timeFormat || TimeFormat.TWELVE_HOUR;
    let defaultTemplates = {
      reminder: { body: null as string | null, subject: null as string | null },
      rating: { body: null as string | null, subject: null as string | null },
    };

    if (emailBody) {
      const tEn = await getTranslation("en", "common");
      defaultTemplates = {
        reminder: {
          body: getTemplateBodyForAction({
            action,
            template: WorkflowTemplates.REMINDER,
            locale: "en",
            t: tEn,
            timeFormat,
          }),
          subject: getTemplateSubjectForAction({
            action,
            template: WorkflowTemplates.REMINDER,
            locale: "en",
            t: tEn,
            timeFormat,
          }),
        },
        rating: {
          body: getTemplateBodyForAction({
            action,
            template: WorkflowTemplates.RATING,
            locale: "en",
            t: tEn,
            timeFormat,
          }),
          subject: getTemplateSubjectForAction({
            action,
            template: WorkflowTemplates.RATING,
            locale: "en",
            t: tEn,
            timeFormat,
          }),
        },
      };
    }

    const matchedTemplate = detectMatchedTemplate({
      emailBody,
      emailSubject,
      template,
      defaultTemplates,
    });

    if (matchedTemplate === WorkflowTemplates.REMINDER) {
      const t = await getTranslation(locale, "common");
      const meetingUrl =  
        getVideoCallUrlFromCalEvent({
          videoCallData: evt.videoCallData,
          uid: evt.uid,
          location: evt.location,
        }) || bookingMetadataSchema.safeParse(evt.metadata || {}).data?.videoCallUrl;
      emailContent = emailReminderTemplate({
        isEditingMode: false,
        locale,
        t,
        action,
        timeFormat: evt.organizer.timeFormat,
        startTime,
        endTime,
        eventName: evt.title,
        timeZone,
        location: evt.location || "",
        meetingUrl,
        otherPerson: attendeeName,
        name,
      });
    } else if (matchedTemplate === WorkflowTemplates.RATING) {
      emailContent = emailRatingTemplate({
        isEditingMode: false,
        locale,
        action,
        t: await getTranslation(locale, "common"),
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
    } else if (emailBody) {
      const recipientEmail = getWorkflowRecipientEmail({
        action,
        attendeeEmail: attendeeToBeUsedInMail.email,
        organizerEmail: evt.organizer.email,
        sendToEmail: sendTo[0],
      });
      const meetingUrl =
        getVideoCallUrlFromCalEvent({
          videoCallData: evt.videoCallData,
          uid: evt.uid,
          location: evt.location,
        }) || bookingMetadataSchema.safeParse(evt.metadata || {}).data?.videoCallUrl;

      const cancelLink = this.buildCancelLink({
        evt,
        bookerUrl,
        recipientEmail,
        isEmailAttendeeAction,
        seatReferenceUid,
      });

      const rescheduleLink = this.buildRescheduleLink({
        evt,
        bookerUrl,
        recipientEmail,
        isEmailAttendeeAction,
        seatReferenceUid,
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
        meetingUrl,
        cancelLink,
        cancelReason: evt.cancellationReason,
        rescheduleLink,
        rescheduleReason: evt.rescheduleReason,
        ratingUrl: `${bookerUrl}/booking/${evt.uid}?rating`,
        noShowUrl: `${bookerUrl}/booking/${evt.uid}?noShow=true`,
        attendeeTimezone: attendeeToBeUsedInMail.timeZone,
        eventTimeInAttendeeTimezone: dayjs(startTime).tz(attendeeToBeUsedInMail.timeZone),
        eventEndTimeInAttendeeTimezone: dayjs(endTime).tz(attendeeToBeUsedInMail.timeZone),
      };

      const emailSubjectTemplate = customTemplate(emailSubject, variables, locale, evt.organizer.timeFormat);
      emailContent.emailSubject = emailSubjectTemplate.text;
      emailContent.emailBody = customTemplate(
        emailBody,
        variables,
        locale,
        evt.organizer.timeFormat,
        hideBranding
      ).html;
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
      organizer: {
        ...evt.organizer,
        language: { ...evt.organizer.language, translate: organizerT },
      },
      attendees: processedAttendees,
      location: bookingMetadataSchema.safeParse(evt.metadata || {}).data?.videoCallUrl || evt.location,
    };

    const shouldIncludeCalendarEvent =
      includeCalendarEvent && triggerEvent !== WorkflowTriggerEvents.BOOKING_REQUESTED;

    const attachments = shouldIncludeCalendarEvent
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

  private buildCancelLink({
    evt,
    bookerUrl,
    recipientEmail,
    isEmailAttendeeAction,
    seatReferenceUid,
  }: {
    evt: BookingInfo;
    bookerUrl: string;
    recipientEmail: string | null;
    isEmailAttendeeAction: boolean;
    seatReferenceUid?: string;
  }): string {
    const seatUidToUse = isEmailAttendeeAction ? seatReferenceUid : undefined;

    if (evt.platformClientId && evt.platformCancelUrl) {
      return buildPlatformCancelLink({
        platformCancelUrl: evt.platformCancelUrl,
        uid: evt.uid,
        slug: evt.eventType?.slug,
        username: evt.organizer.username ?? undefined,
        isRecurring: !!evt.eventType?.recurringEvent,
        seatReferenceUid: seatUidToUse,
        teamId: evt.team?.id,
      });
    }

    return buildStandardCancelLink({
      bookerUrl,
      uid: evt.uid,
      cancelledBy: recipientEmail,
      seatReferenceUid: seatUidToUse,
    });
  }

  private buildRescheduleLink({
    evt,
    bookerUrl,
    recipientEmail,
    isEmailAttendeeAction,
    seatReferenceUid,
  }: {
    evt: BookingInfo;
    bookerUrl: string;
    recipientEmail: string | null;
    isEmailAttendeeAction: boolean;
    seatReferenceUid?: string;
  }): string {
    const seatUidToUse = isEmailAttendeeAction ? seatReferenceUid : undefined;

    if (evt.platformClientId && evt.platformRescheduleUrl) {
      return buildPlatformRescheduleLink({
        platformRescheduleUrl: evt.platformRescheduleUrl,
        uid: evt.uid,
        slug: evt.eventType?.slug,
        username: evt.organizer.username ?? undefined,
        seatReferenceUid: seatUidToUse,
        teamId: evt.team?.id,
      });
    }

    return buildStandardRescheduleLink({
      bookerUrl,
      uid: evt.uid,
      rescheduledBy: recipientEmail,
      seatReferenceUid: seatUidToUse,
    });
  }
}
