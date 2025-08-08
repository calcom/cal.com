import type { MailData } from "@sendgrid/helpers/classes/mail";
import type { EventStatus } from "ics";
import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import generateIcsString from "@calcom/emails/lib/generateIcsString";
import { preprocessNameFieldDataWithVariant } from "@calcom/features/form-builder/utils";
import { WEBSITE_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import type { TimeUnit } from "@calcom/prisma/enums";
import {
  WorkflowActions,
  WorkflowMethods,
  WorkflowTemplates,
  WorkflowTriggerEvents,
} from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";

import type { timeUnitLowerCase } from "../config/constants";
import type { ScheduleEmailReminderAction } from "../config/types";
import type { AttendeeInBookingInfo, BookingInfo } from "../config/types";
import { getBatchId, sendSendgridMail } from "../providers/sendgrid";
import type { VariablesType } from "../templates/customTemplate";
import customTemplate from "../templates/customTemplate";
import emailRatingTemplate from "../templates/email/ratingTemplate";
import emailReminderTemplate from "../templates/email/reminder";
import emailThankYouTemplate from "../templates/email/thankYouTemplate";

const messageLogger = logger.getSubLogger({ prefix: ["[emailReminderManager]"] });

export interface ScheduleReminderArgs {
  evt: BookingInfo;
  triggerEvent: WorkflowTriggerEvents;
  timeSpan: {
    time: number | null;
    timeUnit: TimeUnit | null;
  };
  template?: WorkflowTemplates;
  sender?: string | null;
  workflowStepId?: number;
  seatReferenceUid?: string;
  attendeeId?: number;
}

interface EmailNotificationParameters extends ScheduleReminderArgs {
  evt: BookingInfo;
  sendTo: MailData["to"];
  action: ScheduleEmailReminderAction;
  emailSubject?: string;
  emailBody?: string;
  hideBranding?: boolean;
  includeCalendarEvent?: boolean;
  isMandatoryReminder?: boolean;
}

interface EmailContentData {
  emailSubject: string;
  emailBody: string;
}

interface RecipientConfiguration {
  targetName: string;
  targetEmail: string | null;
  participantInfo: AttendeeInBookingInfo | null;
  participantName: string;
  targetTimezone: string;
}

const determineScheduledTimestamp = (
  triggerType: WorkflowTriggerEvents,
  eventStart: string,
  eventEnd: string,
  timeOffset: { time: number | null; timeUnit: TimeUnit | null }
): dayjs.Dayjs | null => {
  const timeUnitNormalized: timeUnitLowerCase | undefined =
    timeOffset.timeUnit?.toLocaleLowerCase() as timeUnitLowerCase;

  if (triggerType === WorkflowTriggerEvents.BEFORE_EVENT) {
    return timeOffset.time && timeUnitNormalized
      ? dayjs(eventStart).subtract(timeOffset.time, timeUnitNormalized)
      : null;
  } else if (triggerType === WorkflowTriggerEvents.AFTER_EVENT) {
    return timeOffset.time && timeUnitNormalized
      ? dayjs(eventEnd).add(timeOffset.time, timeUnitNormalized)
      : null;
  }

  return null;
};

const extractRecipientEmailFromSendTo = (sendToData: MailData["to"]): string | null => {
  if (typeof sendToData === "string") {
    return sendToData;
  } else if (Array.isArray(sendToData)) {
    const firstEntry = sendToData[0];
    if (typeof firstEntry === "object" && firstEntry !== null) {
      return firstEntry.email;
    } else if (typeof firstEntry === "string") {
      return firstEntry;
    }
  } else if (typeof sendToData === "object" && sendToData !== null) {
    return sendToData.email;
  }

  return null;
};

const resolveRecipientDetails = (
  workflowAction: ScheduleEmailReminderAction,
  eventData: BookingInfo,
  recipientTarget: MailData["to"]
): RecipientConfiguration => {
  let targetName = "";
  let targetEmail: string | null = null;
  let participantInfo: AttendeeInBookingInfo | null = null;
  let participantName = "";
  let targetTimezone = "";

  switch (workflowAction) {
    case WorkflowActions.EMAIL_ADDRESS:
      targetName = "";
      participantInfo = eventData.attendees[0];
      participantName = eventData.attendees[0].name;
      targetTimezone = eventData.organizer.timeZone;
      break;

    case WorkflowActions.EMAIL_HOST:
      participantInfo = eventData.attendees[0];
      targetName = eventData.organizer.name;
      participantName = participantInfo.name;
      targetTimezone = eventData.organizer.timeZone;
      break;

    case WorkflowActions.EMAIL_ATTENDEE:
      targetEmail = extractRecipientEmailFromSendTo(recipientTarget);

      const matchingAttendee = eventData.attendees.find((attendee) => attendee.email === targetEmail);
      participantInfo = matchingAttendee || eventData.attendees[0];
      targetName = participantInfo.name;
      participantName = eventData.organizer.name;
      targetTimezone = participantInfo.timeZone;
      break;
  }

  return {
    targetName,
    targetEmail,
    participantInfo,
    participantName,
    targetTimezone,
  };
};

const constructVariablesForTemplate = (
  eventData: BookingInfo,
  participantData: AttendeeInBookingInfo,
  eventStartTime: string,
  eventEndTime: string,
  targetTimezone: string,
  bookerBaseUrl: string
): VariablesType => {
  return {
    eventName: eventData.title || "",
    organizerName: eventData.organizer.name,
    attendeeName: participantData.name,
    attendeeFirstName: participantData.firstName,
    attendeeLastName: participantData.lastName,
    attendeeEmail: participantData.email,
    eventDate: dayjs(eventStartTime).tz(targetTimezone),
    eventEndTime: dayjs(eventEndTime).tz(targetTimezone),
    timeZone: targetTimezone,
    location: eventData.location,
    additionalNotes: eventData.additionalNotes,
    responses: eventData.responses,
    meetingUrl: bookingMetadataSchema.parse(eventData.metadata || {})?.videoCallUrl,
    cancelLink: `${bookerBaseUrl}/booking/${eventData.uid}?cancel=true`,
    rescheduleLink: `${bookerBaseUrl}/reschedule/${eventData.uid}`,
    ratingUrl: `${bookerBaseUrl}/booking/${eventData.uid}?rating`,
    noShowUrl: `${bookerBaseUrl}/booking/${eventData.uid}?noShow=true`,
    attendeeTimezone: eventData.attendees[0].timeZone,
    eventTimeInAttendeeTimezone: dayjs(eventStartTime).tz(eventData.attendees[0].timeZone),
    eventEndTimeInAttendeeTimezone: dayjs(eventEndTime).tz(eventData.attendees[0].timeZone),
  };
};

const generateEmailContentFromTemplate = (
  templateType: WorkflowTemplates | undefined,
  customSubject: string,
  customBody: string,
  eventData: BookingInfo,
  recipientDetails: RecipientConfiguration,
  workflowAction: ScheduleEmailReminderAction,
  hideBrandingFlag?: boolean,
  bookerBaseUrl?: string
): EmailContentData => {
  const { startTime, endTime } = eventData;
  const { targetName, participantInfo, participantName, targetTimezone } = recipientDetails;

  if (customBody) {
    const templateVariables = constructVariablesForTemplate(
      eventData,
      participantInfo!,
      startTime,
      endTime,
      targetTimezone,
      bookerBaseUrl || WEBSITE_URL
    );

    const userLocale =
      workflowAction === WorkflowActions.EMAIL_ATTENDEE
        ? participantInfo!.language?.locale
        : eventData.organizer.language.locale;

    const processedSubject = customTemplate(
      customSubject,
      templateVariables,
      userLocale,
      eventData.organizer.timeFormat
    );
    const processedBody = customTemplate(
      customBody,
      templateVariables,
      userLocale,
      eventData.organizer.timeFormat,
      hideBrandingFlag
    );

    return {
      emailSubject: processedSubject.text,
      emailBody: processedBody.html,
    };
  }

  const commonTemplateParams = {
    startTime,
    endTime,
    eventName: eventData.title,
    timeZone: targetTimezone,
    name: targetName,
  };

  switch (templateType) {
    case WorkflowTemplates.REMINDER:
      return emailReminderTemplate({
        isEditingMode: false,
        locale: eventData.organizer.language.locale,
        action: workflowAction,
        timeFormat: eventData.organizer.timeFormat,
        startTime,
        endTime,
        eventName: eventData.title,
        timeZone: targetTimezone,
        location: eventData.location || "",
        meetingUrl: bookingMetadataSchema.parse(eventData.metadata || {})?.videoCallUrl || "",
        otherPerson: participantName,
        name: targetName,
      });

    case WorkflowTemplates.RATING:
      return emailRatingTemplate({
        isEditingMode: true,
        locale: eventData.organizer.language.locale,
        action: workflowAction,
        timeFormat: eventData.organizer.timeFormat,
        ...commonTemplateParams,
        organizer: eventData.organizer.name,
        ratingUrl: `${bookerBaseUrl || WEBSITE_URL}/booking/${eventData.uid}?rating`,
        noShowUrl: `${bookerBaseUrl || WEBSITE_URL}/booking/${eventData.uid}?noShow=true`,
      });

    case WorkflowTemplates.THANKYOU:
      return emailThankYouTemplate({
        isEditingMode: false,
        timeFormat: eventData.organizer.timeFormat,
        ...commonTemplateParams,
        otherPerson: participantName,
      });

    default:
      return {
        emailSubject: customSubject,
        emailBody: `<body style="white-space: pre-wrap;">${customBody}</body>`,
      };
  }
};

const prepareEmailTransmission = async (
  eventData: BookingInfo,
  emailContentData: EmailContentData,
  shouldIncludeCalendar?: boolean,
  customSender?: string | null,
  batchId?: string
) => {
  return async (recipientData: Partial<MailData>, eventTrigger?: WorkflowTriggerEvents) => {
    const calendarStatus: EventStatus =
      eventTrigger === WorkflowTriggerEvents.EVENT_CANCELLED ? "CANCELLED" : "CONFIRMED";

    const organizerTranslations = await getTranslation(eventData.organizer.language.locale || "en", "common");
    const attendeeTranslations = await getTranslation(
      eventData.attendees[0].language.locale || "en",
      "common"
    );

    const processedAttendee = {
      ...eventData.attendees[0],
      name: preprocessNameFieldDataWithVariant("fullName", eventData.attendees[0].name) as string,
      language: { ...eventData.attendees[0].language, translate: attendeeTranslations },
    };

    const enrichedEventData = {
      ...eventData,
      type: eventData.eventType?.slug || "",
      organizer: {
        ...eventData.organizer,
        language: { ...eventData.organizer.language, translate: organizerTranslations },
      },
      attendees: [processedAttendee],
    };

    return sendSendgridMail(
      {
        to: recipientData.to,
        subject: emailContentData.emailSubject,
        html: emailContentData.emailBody,
        batchId: batchId,
        replyTo: recipientData.replyTo,
        attachments: shouldIncludeCalendar
          ? [
              {
                content: Buffer.from(
                  generateIcsString({
                    event: enrichedEventData,
                    status: calendarStatus,
                  }) || ""
                ).toString("base64"),
                filename: "event.ics",
                type: "text/calendar; method=REQUEST",
                disposition: "attachment",
                contentId: uuidv4(),
              },
            ]
          : undefined,
        sendAt: recipientData.sendAt,
      },
      { sender: customSender },
      {
        ...(eventData.eventTypeId && {
          eventTypeId: eventData.eventTypeId,
        }),
      }
    );
  };
};

const determineReplyToAddress = (recipientTarget: MailData["to"], eventData: BookingInfo): string => {
  const isRecipientArray = Array.isArray(recipientTarget);
  const isOrganizerRecipient = isRecipientArray
    ? recipientTarget[0] === eventData.organizer.email
    : recipientTarget === eventData.organizer.email;

  return isOrganizerRecipient ? eventData.attendees[0].email : eventData.organizer.email;
};

const handleImmediateEmailDispatch = async (
  recipientTarget: MailData["to"],
  emailDispatcher: (data: Partial<MailData>, trigger?: WorkflowTriggerEvents) => Promise<any>,
  replyToAddress: string,
  triggerType: WorkflowTriggerEvents
) => {
  try {
    if (!recipientTarget) throw new Error("No email addresses provided");

    const recipientList = Array.isArray(recipientTarget) ? recipientTarget : [recipientTarget];
    const transmissionPromises = recipientList.map((emailAddress) =>
      emailDispatcher({ to: emailAddress, replyTo: replyToAddress }, triggerType)
    );

    await Promise.all(transmissionPromises);
  } catch (error) {
    messageLogger.error("Error sending Email");
  }
};

const createReminderRecord = async (
  eventUid: string,
  workflowStepId: number | undefined,
  scheduledTimestamp: dayjs.Dayjs,
  isScheduled: boolean,
  batchId: string | undefined,
  seatReference: string | undefined,
  participantId: number | undefined,
  isMandatory: boolean
) => {
  const baseReminderData = {
    bookingUid: eventUid,
    method: WorkflowMethods.EMAIL,
    scheduledDate: scheduledTimestamp.toDate(),
    scheduled: isScheduled,
    seatReferenceId: seatReference,
    ...(participantId && { attendeeId: participantId }),
    ...(batchId && { referenceId: batchId }),
  };

  if (!isMandatory) {
    await prisma.workflowReminder.create({
      data: {
        ...baseReminderData,
        workflowStepId: workflowStepId,
      },
    });
  } else {
    await prisma.workflowReminder.create({
      data: {
        ...baseReminderData,
        isMandatoryReminder: true,
      },
    });
  }
};

const handleScheduledEmailDispatch = async (
  recipientTarget: MailData["to"],
  emailDispatcher: (data: Partial<MailData>, trigger?: WorkflowTriggerEvents) => Promise<any>,
  replyToAddress: string,
  scheduledTimestamp: dayjs.Dayjs,
  triggerType: WorkflowTriggerEvents,
  eventUid: string,
  workflowStepId: number | undefined,
  seatReference: string | undefined,
  participantId: number | undefined,
  isMandatory: boolean,
  batchId: string
) => {
  const currentMoment = dayjs();

  // SendGrid scheduling constraints: 60 minutes minimum, 2 hours maximum advance
  if (
    currentMoment.isBefore(scheduledTimestamp.subtract(1, "hour")) &&
    !scheduledTimestamp.isAfter(currentMoment.add(2, "hour"))
  ) {
    try {
      await emailDispatcher(
        {
          to: recipientTarget,
          sendAt: scheduledTimestamp.unix(),
          replyTo: replyToAddress,
        },
        triggerType
      );

      await createReminderRecord(
        eventUid,
        workflowStepId,
        scheduledTimestamp,
        true,
        batchId,
        seatReference,
        participantId,
        isMandatory
      );
    } catch (error) {
      messageLogger.error(`Error scheduling email with error ${error}`);
    }
  } else if (scheduledTimestamp.isAfter(currentMoment.add(2, "hour"))) {
    // Schedule via CRON for times beyond 2 hours
    await createReminderRecord(
      eventUid,
      workflowStepId,
      scheduledTimestamp,
      false,
      undefined,
      seatReference,
      participantId,
      isMandatory
    );
  }
};

export const scheduleEmailReminder = async (params: EmailNotificationParameters) => {
  const {
    evt,
    triggerEvent,
    timeSpan,
    template,
    sender,
    workflowStepId,
    seatReferenceUid,
    sendTo,
    emailSubject = "",
    emailBody = "",
    hideBranding,
    includeCalendarEvent,
    isMandatoryReminder,
    action,
    attendeeId,
  } = params;

  const { startTime, endTime, uid: eventUid } = evt;
  const scheduledTimestamp = determineScheduledTimestamp(triggerEvent, startTime, endTime, timeSpan);

  const recipientConfiguration = resolveRecipientDetails(action, evt, sendTo);
  const bookerBaseUrl = evt.bookerUrl ?? WEBSITE_URL;

  const emailContentData = generateEmailContentFromTemplate(
    template,
    emailSubject,
    emailBody,
    evt,
    recipientConfiguration,
    action,
    hideBranding,
    bookerBaseUrl
  );

  messageLogger.debug(`Sending Email for trigger ${triggerEvent}`, JSON.stringify(emailContentData));
  const batchId = await getBatchId();

  const emailDispatcher = await prepareEmailTransmission(
    evt,
    emailContentData,
    includeCalendarEvent,
    sender,
    batchId
  );

  const replyToAddress = determineReplyToAddress(sendTo, evt);

  if (
    triggerEvent === WorkflowTriggerEvents.NEW_EVENT ||
    triggerEvent === WorkflowTriggerEvents.EVENT_CANCELLED ||
    triggerEvent === WorkflowTriggerEvents.RESCHEDULE_EVENT
  ) {
    await handleImmediateEmailDispatch(sendTo, emailDispatcher, replyToAddress, triggerEvent);
  } else if (
    (triggerEvent === WorkflowTriggerEvents.BEFORE_EVENT ||
      triggerEvent === WorkflowTriggerEvents.AFTER_EVENT) &&
    scheduledTimestamp
  ) {
    await handleScheduledEmailDispatch(
      sendTo,
      emailDispatcher,
      replyToAddress,
      scheduledTimestamp,
      triggerEvent,
      eventUid as string,
      workflowStepId,
      seatReferenceUid,
      attendeeId,
      isMandatoryReminder || false,
      batchId
    );
  }
};

export const deleteScheduledEmailReminder = async (
  reminderIdentifier: number,
  referenceIdentifier: string | null
) => {
  try {
    await prisma.workflowReminder.update({
      where: {
        id: reminderIdentifier,
      },
      data: {
        cancelled: true,
      },
    });
  } catch (error) {
    messageLogger.error(`Error canceling reminder with error ${error}`);
  }
};
