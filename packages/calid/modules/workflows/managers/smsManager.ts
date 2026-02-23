import dayjs from "@calcom/dayjs";
import { SENDER_ID, WEBSITE_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { WorkflowTemplates, WorkflowActions, WorkflowMethods, WorkflowStatus } from "@calcom/prisma/enums";
import { WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";

import type { timeUnitLowerCase } from "../config/constants";
import type {
  CalIdAttendeeInBookingInfo,
  CalIdScheduleTextReminderAction,
  CalIdScheduleTextReminderArgs,
} from "../config/types";
import * as smsService from "../providers/messaging/dispatcher";
import type { VariablesType } from "../templates/customTemplate";
import customTemplate from "../templates/customTemplate";
import { getSenderId } from "../utils/getSenderId";
import wordTruncate from "../utils/getTruncatedString";

const moduleLogger = logger.getSubLogger({ prefix: ["[smsReminderManager]"] });

/**
 * Mapping of workflow templates to their default message templates
 * Uses numbered placeholders: {{1}}, {{2}}, {{3}}, {{4}}, {{5}}, {{6}}
 * {{1}} - Recipient's Name
 * {{2}} - Meeting Title
 * {{3}} - Sender's Name
 * {{4}} - Date
 * {{5}} - Time
 * {{6}} - Timezone
 */
export const WORKFLOW_TEMPLATE_TO_DEFAULT_MESSAGE: Record<WorkflowTemplates, string> = {
  [WorkflowTemplates.REMINDER]: `Hi {{1}} - Just a heads-up, your meeting "{{2}} with {{3}}" is coming up on {{4}} at {{5}} {{6}}. See you then!\n\n- Cal ID`,
  [WorkflowTemplates.CANCELLED]: `Hi {{1}} - Your meeting "{{2}} with {{3}}" scheduled for {{4}} at {{5}} {{6}} has been cancelled.\n\n- Cal ID`,
  [WorkflowTemplates.RESCHEDULED]: `Hi {{1}} - Your meeting "{{2}} with {{3}}" has a new time: {{4}} at {{5}} {{6}}. See you then!\n\n- Cal ID`,
  [WorkflowTemplates.COMPLETED]: `Hi {{1}} - Your meeting "{{2}} with {{3}}" on {{4}} at {{5}} {{6}} is all wrapped up. Thanks for joining!\n\n- Cal ID`,
  [WorkflowTemplates.CONFIRMATION]: `Hi {{1}} - You are all set! Your meeting "{{2}} with {{3}}" is confirmed for {{4}} at {{5}} {{6}}. See you then!\n\n- Cal ID`,
  // CUSTOM workflow uses user-provided messageTemplate, so no default needed
  [WorkflowTemplates.CUSTOM]: "",
  // RATING and THANKYOU currently have no default templates - will throw error if used
  [WorkflowTemplates.RATING]: "",
  [WorkflowTemplates.THANKYOU]: "",
};

/**
 * Interpolate numbered placeholders in default templates with actual values
 */
const interpolateDefaultTemplate = (
  template: string,
  recipientName: string,
  senderName: string,
  eventTitle: string,
  eventDate: string,
  eventTime: string,
  timezone: string
): string => {
  return template
    .replace(/\{\{1\}\}/g, recipientName)
    .replace(/\{\{2\}\}/g, eventTitle)
    .replace(/\{\{3\}\}/g, senderName)
    .replace(/\{\{4\}\}/g, eventDate)
    .replace(/\{\{5\}\}/g, eventTime)
    .replace(/\{\{6\}\}/g, timezone);
};

const validateNumberVerification = async (
  actionType: CalIdScheduleTextReminderAction,
  phoneNumber: string | null,
  userIdentifier?: number | null,
  teamIdentifier?: number | null,
  pendingVerification = false
): Promise<boolean> => {
  if (actionType === WorkflowActions.SMS_ATTENDEE) return true;

  const verificationRecord = await prisma.verifiedNumber.findFirst({
    where: {
      OR: [{ userId: userIdentifier }, { calIdTeamId: teamIdentifier }],
      phoneNumber: phoneNumber || "",
    },
  });

  return verificationRecord ? true : pendingVerification;
};

const determineTargetAttendee = (
  actionType: CalIdScheduleTextReminderAction,
  eventData: any,
  phoneContact: string | null
): CalIdAttendeeInBookingInfo => {
  if (actionType !== WorkflowActions.SMS_ATTENDEE) {
    return eventData.attendees[0];
  }

  const matchingAttendee =
    phoneContact &&
    eventData.attendees.find(
      (participant: CalIdAttendeeInBookingInfo) => participant.email === eventData.responses?.email?.value
    );

  return matchingAttendee || eventData.attendees[0];
};

const calculateScheduledDateTime = (
  triggerType: WorkflowTriggerEvents,
  eventStartTime: string,
  eventEndTime: string,
  timeConfiguration: { time?: number; timeUnit?: string }
): dayjs.Dayjs | null => {
  const { time, timeUnit } = timeConfiguration;
  const normalizedUnit = timeUnit?.toLocaleLowerCase() as timeUnitLowerCase;

  if (!time || !normalizedUnit) return null;

  switch (triggerType) {
    case WorkflowTriggerEvents.BEFORE_EVENT:
      return dayjs(eventStartTime).subtract(time, normalizedUnit);
    case WorkflowTriggerEvents.AFTER_EVENT:
      return dayjs(eventEndTime).add(time, normalizedUnit);
    case WorkflowTriggerEvents.NEW_EVENT:
    case WorkflowTriggerEvents.EVENT_CANCELLED:
    case WorkflowTriggerEvents.RESCHEDULE_EVENT:
      // For traditionally immediate events, schedule relative to current time
      // You can modify this logic based on your specific requirements
      return dayjs().add(time, normalizedUnit);
    default:
      return null;
  }
};

const buildMessageVariables = (
  eventInfo: any,
  targetAttendee: CalIdAttendeeInBookingInfo
): VariablesType => ({
  eventName: eventInfo.title,
  organizerName: eventInfo.organizer.name,
  attendeeName: targetAttendee.name,
  attendeeFirstName: targetAttendee.firstName,
  attendeeLastName: targetAttendee.lastName,
  attendeeEmail: targetAttendee.email,
  eventDate: dayjs(eventInfo.startTime).tz(targetAttendee.timeZone),
  eventEndTime: dayjs(eventInfo.endTime).tz(targetAttendee.timeZone),
  timezone: targetAttendee.timeZone,
  location: eventInfo.location,
  additionalNotes: eventInfo.additionalNotes,
  responses: eventInfo.responses,
  meetingUrl: bookingMetadataSchema.parse(eventInfo.metadata || {})?.videoCallUrl,
  cancelLink: `${eventInfo.bookerUrl ?? WEBSITE_URL}/booking/${eventInfo.uid}?cancel=true`,
  rescheduleLink: `${eventInfo.bookerUrl ?? WEBSITE_URL}/reschedule/${eventInfo.uid}`,
  attendeeTimezone: eventInfo.attendees[0].timeZone,
  eventTimeInAttendeeTimezone: dayjs(eventInfo.startTime).tz(eventInfo.attendees[0].timeZone),
  eventEndTimeInAttendeeTimezone: dayjs(eventInfo.endTime).tz(eventInfo.attendees[0].timeZone),
});

const getEventTitleFromBookingTitle = (str: string) => {
  const match = str.match(/^(.*?)\s+between\b/i);
  return match ? match[1].trim() : str;
};

const generateMessageContent = (
  messageTemplate: string,
  workflowTemplate: WorkflowTemplates | undefined,
  eventDetails: any,
  actionType: CalIdScheduleTextReminderAction,
  targetParticipant: CalIdAttendeeInBookingInfo,
  recipientLocale: string,
  recipientTimezone: string
): string => {
  if (workflowTemplate === WorkflowTemplates.CUSTOM && messageTemplate) {
    const templateVariables = buildMessageVariables(eventDetails, targetParticipant);
    const processedMessage = customTemplate(
      messageTemplate,
      templateVariables,
      recipientLocale,
      eventDetails.organizer.timeFormat
    );
    return processedMessage.text;
  }

  // For all other workflow templates, use the default template mapping
  if (workflowTemplate && workflowTemplate !== WorkflowTemplates.CUSTOM) {
    const defaultTemplate = WORKFLOW_TEMPLATE_TO_DEFAULT_MESSAGE[workflowTemplate];

    if (!defaultTemplate) {
      throw new Error(
        `No default message template found for workflow template: ${workflowTemplate}. Please add a default template or use CUSTOM workflow type.`
      );
    }

    // Determine recipient name, sender name and event details for interpolation
    const recipientName =
      actionType === WorkflowActions.SMS_ATTENDEE ? targetParticipant.name : eventDetails.organizer.name;

    const senderName =
      actionType === WorkflowActions.SMS_ATTENDEE ? eventDetails.organizer.name : targetParticipant.name;
    // const eventTitle = eventDetails.title;
    const eventTitle = wordTruncate(
      (eventDetails.eventType.title ?? getEventTitleFromBookingTitle(eventDetails.title))
        .trim()
        .replace(/"/g, "")
    );

    // Format date and time according to recipient's locale and timezone
    const eventMoment = dayjs(eventDetails.startTime).tz(recipientTimezone).locale(recipientLocale);
    const formattedDate = eventMoment.format("DD MMM YYYY");
    const formattedTimeWithLocalizedTimeZone = eventMoment.format("h:mma [GMT]Z");
    const [formattedTime, localizedRecipientTimezone] = formattedTimeWithLocalizedTimeZone.split(" ");

    // Interpolate the default template with actual values
    return interpolateDefaultTemplate(
      defaultTemplate,
      recipientName.split(" ")[0],
      senderName.split(" ")[0],
      eventTitle,
      formattedDate,
      formattedTime,
      localizedRecipientTimezone
    );
  }

  // Fallback: if no workflowTemplate provided, return empty string
  moduleLogger.warn("No workflowTemplate provided for message generation");
  return "";
};

const createWorkflowInsight = async (
  msgId: string,
  eventTypeId: number,
  bookingUid?: string | null,
  seatReferenceUid?: string | null,
  workflowId?: number | null,
  workflowStepId?: number | null,
  metadata?: Record<string, string | Date | boolean>
) => {
  await prisma.calIdWorkflowInsights.create({
    data: {
      msgId,
      type: WorkflowMethods.SMS,
      status: WorkflowStatus.QUEUED,

      eventType: {
        connect: { id: eventTypeId },
      },

      ...(bookingUid && {
        booking: { connect: { uid: bookingUid } },
      }),

      ...(seatReferenceUid && {
        bookingSeat: { connect: { referenceUid: seatReferenceUid } },
      }),

      ...(workflowId && {
        workflow: { connect: { id: workflowId } },
      }),

      ...(workflowStepId && {
        workflowStep: { connect: { id: workflowStepId } },
      }),

      ...(metadata && { metadata }),
    },
  });
};

const executeImmediateNotification = async (
  phoneDestination: string,
  textContent: string,
  senderIdentifier: string,
  workflowTemplate: WorkflowTemplates | undefined,
  userRef?: number | null,
  teamRef?: number | null,
  eventTypeRef?: number | null,
  bookingRef?: string | null,
  seatRef?: string | null,
  workflowId?: number | null,
  workflowStepId?: number | null
): Promise<void> => {
  try {
    const msgRes = await smsService.sendSMS(
      phoneDestination,
      textContent,
      senderIdentifier,
      userRef,
      teamRef,
      false,
      workflowTemplate,
      undefined
    );
    const msgId = msgRes.response.sid;
    if (msgId && eventTypeRef) {
      await createWorkflowInsight(msgId, eventTypeRef, bookingRef, seatRef, workflowId, workflowStepId, {
        recipientNumber: phoneDestination,
        smsText: textContent,
        sendAt: new Date(),
        isScheduled: false,
      });
    }
  } catch (exception) {
    moduleLogger.error(`Immediate SMS delivery failed: ${exception}`);
    throw exception;
  }
};

const scheduleDelayedNotification = async (
  phoneDestination: string,
  textContent: string,
  dispatchTime: dayjs.Dayjs,
  senderIdentifier: string,
  bookingReference: string,
  stepReference: number,
  workflowTemplate: WorkflowTemplates | undefined,
  seatReference?: string | null,
  userRef?: number | null,
  teamRef?: number | null,
  eventTypeRef?: number | null,
  workflowId?: number | null
): Promise<void> => {
  try {
    const scheduledMessage = await smsService.scheduleSMS(
      phoneDestination,
      textContent,
      dispatchTime.toDate(),
      senderIdentifier,
      userRef,
      teamRef,
      false,
      workflowTemplate,
      undefined
    );

    if (scheduledMessage.response.sid) {
      await prisma.calIdWorkflowReminder.create({
        data: {
          bookingUid: bookingReference,
          workflowStepId: stepReference,
          method: WorkflowMethods.SMS,
          scheduledDate: dispatchTime.toDate(),
          scheduled: true,
          referenceId: scheduledMessage.response.sid || "",
          seatReferenceId: seatReference,
        },
      });
      if (eventTypeRef) {
        await createWorkflowInsight(
          scheduledMessage.response.sid,
          eventTypeRef,
          bookingReference,
          seatReference ?? undefined,
          workflowId ?? undefined,
          stepReference,
          {
            recipientNumber: phoneDestination,
            smsText: textContent,
            sendAt: new Date(),
            isScheduled: true,
          }
        );
      }
    }
  } catch (exception) {
    moduleLogger.error(`Scheduled SMS creation failed: ${exception}`);
  }
};

const storeFutureReminder = async (
  bookingReference: string,
  stepReference: number,
  dispatchTime: dayjs.Dayjs,
  seatReference?: string | null
): Promise<void> => {
  await prisma.calIdWorkflowReminder.create({
    data: {
      bookingUid: bookingReference,
      workflowStepId: stepReference,
      method: WorkflowMethods.SMS,
      scheduledDate: dispatchTime.toDate(),
      scheduled: false,
      seatReferenceId: seatReference,
    },
  });
};

const processScheduledReminder = async (
  phoneDestination: string,
  textContent: string,
  dispatchTime: dayjs.Dayjs,
  senderIdentifier: string,
  bookingReference: string,
  stepReference: number,
  workflowTemplate: WorkflowTemplates | undefined,
  seatReference?: string | null,
  userRef?: number | null,
  teamRef?: number | null,
  eventTypeRef?: number | null,
  workflowId?: number | null
): Promise<void> => {
  const currentMoment = dayjs();
  const twoHourWindow = currentMoment.add(2, "hour");
  // within next 2 hours → schedule delayed notification
  if (dispatchTime.isBefore(twoHourWindow)) {
    await scheduleDelayedNotification(
      phoneDestination,
      textContent,
      dispatchTime,
      senderIdentifier,
      bookingReference,
      stepReference,
      workflowTemplate,
      seatReference,
      userRef,
      teamRef,
      eventTypeRef,
      workflowId
    );
  }
  // beyond 2 hours → store as future reminder
  else {
    await storeFutureReminder(bookingReference, stepReference, dispatchTime, seatReference);
  }
};

const determineRecipientDetails = (
  actionType: CalIdScheduleTextReminderAction,
  targetAttendee: CalIdAttendeeInBookingInfo,
  organizerInfo: any
) => {
  const isAttendeeAction = actionType === WorkflowActions.SMS_ATTENDEE;

  return {
    recipientName: isAttendeeAction ? targetAttendee.name : "",
    organizerName: isAttendeeAction ? organizerInfo.name : targetAttendee.name,
    recipientTimezone: isAttendeeAction ? targetAttendee.timeZone : organizerInfo.timeZone,
    recipientLocale: isAttendeeAction ? targetAttendee.language?.locale : organizerInfo.language.locale,
  };
};

export const scheduleSMSReminder = async (parameters: CalIdScheduleTextReminderArgs): Promise<void> => {
  const {
    evt: eventData,
    reminderPhone: phoneDestination,
    triggerEvent: triggerType,
    action: actionType,
    timeSpan: timeConfiguration,
    message: messageTemplate = "",
    workflowStepId: stepReference,
    template: workflowTemplate,
    sender: senderOverride,
    userId: userReference,
    calIdTeamId: teamReference,
    isVerificationPending: pendingVerification = false,
    seatReferenceUid: seatReference,
    workflowId: workflowId,
  } = parameters;

  const { startTime: eventStart, endTime: eventEnd, uid: bookingId } = eventData;
  const senderIdentifier = getSenderId(phoneDestination, senderOverride || SENDER_ID);

  const numberVerified = await validateNumberVerification(
    actionType,
    phoneDestination,
    userReference,
    teamReference,
    pendingVerification
  );

  const targetAttendee = determineTargetAttendee(actionType, eventData, phoneDestination);

  // Always calculate scheduled dispatch time, even for traditionally immediate events
  const scheduledDispatch = calculateScheduledDateTime(triggerType, eventStart, eventEnd, {
    time: timeConfiguration.time ?? undefined,
    timeUnit: timeConfiguration.timeUnit ?? undefined,
  });

  const { recipientName, organizerName, recipientTimezone, recipientLocale } = determineRecipientDetails(
    actionType,
    targetAttendee,
    eventData.organizer
  );

  const messageContent = generateMessageContent(
    messageTemplate,
    workflowTemplate ?? undefined,
    eventData,
    actionType,
    targetAttendee,
    recipientLocale,
    recipientTimezone
  );

  moduleLogger.debug(`Preparing SMS notification for trigger ${triggerType}`, messageContent);

  if (messageContent.length === 0 || !phoneDestination || !numberVerified) return;

  // Determine if this should be immediate or scheduled based on timestamp availability
  const shouldSendImmediately =
    !scheduledDispatch ||
    (scheduledDispatch &&
      (scheduledDispatch.isBefore(dayjs()) || scheduledDispatch.isSame(dayjs(), "minute")));

  if (shouldSendImmediately) {
    // Send immediately for all trigger types when no valid future timestamp exists
    await executeImmediateNotification(
      phoneDestination,
      messageContent,
      senderIdentifier,
      workflowTemplate ?? undefined,
      userReference,
      teamReference,
      eventData.eventType.id,
      bookingId,
      seatReference,
      workflowId,
      stepReference
    );
  } else {
    // Schedule for future delivery when valid timestamp exists
    if (typeof stepReference === "number") {
      await processScheduledReminder(
        phoneDestination,
        messageContent,
        scheduledDispatch,
        senderIdentifier,
        bookingId as string,
        stepReference,
        workflowTemplate ?? undefined,
        seatReference,
        userReference,
        teamReference,
        eventData.eventTypeId,
        workflowId
      );
    } else {
      moduleLogger.error("stepReference is undefined when scheduling SMS reminder.");
    }
  }
};

export const deleteScheduledSMSReminder = async (
  reminderIdentifier: number,
  externalReference: string | null,
  type: WorkflowMethods = WorkflowMethods.SMS
): Promise<void> => {
  try {
    await prisma.calIdWorkflowReminder.update({
      where: { id: reminderIdentifier, scheduledDate: { gt: new Date() } },
      data: { cancelled: true },
    });
  } catch (exception) {
    moduleLogger.error(`Reminder cancellation failed: ${exception}`);
  }
};
