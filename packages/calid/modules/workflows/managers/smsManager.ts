import dayjs from "@calcom/dayjs";
import { SENDER_ID, WEBSITE_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { WorkflowTemplates, WorkflowActions, WorkflowMethods } from "@calcom/prisma/enums";
import { WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";

import type { timeUnitLowerCase } from "../config/constants";
import type {
  CalIdAttendeeInBookingInfo,
  CalIdScheduleTextReminderAction,
  CalIdScheduleTextReminderArgs,
} from "../config/types";
import * as twilio from "../providers/twilio";
import type { VariablesType } from "../templates/customTemplate";
import customTemplate from "../templates/customTemplate";
import smsReminderTemplate from "../templates/sms/reminder";
import { getSenderId } from "../utils/getSenderId";

const moduleLogger = logger.getSubLogger({ prefix: ["[smsReminderManager]"] });

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
      // For traditionally immediate events, schedule relative to event start time
      // You can modify this logic based on your specific requirements
      return dayjs(eventStartTime).add(time, normalizedUnit);
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
  timeZone: targetAttendee.timeZone,
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

const generateMessageContent = (
  messageTemplate: string,
  workflowTemplate: WorkflowTemplates | undefined,
  eventDetails: any,
  actionType: CalIdScheduleTextReminderAction,
  targetParticipant: CalIdAttendeeInBookingInfo,
  recipientLocale: string,
  recipientTimezone: string
): string => {
  if (messageTemplate) {
    const templateVariables = buildMessageVariables(eventDetails, targetParticipant);
    const processedMessage = customTemplate(
      messageTemplate,
      templateVariables,
      recipientLocale,
      eventDetails.organizer.timeFormat
    );
    return processedMessage.text;
  }

  if (workflowTemplate === WorkflowTemplates.REMINDER) {
    const recipientName = actionType === WorkflowActions.SMS_ATTENDEE ? targetParticipant.name : "";
    const organizerName =
      actionType === WorkflowActions.SMS_ATTENDEE ? eventDetails.organizer.name : targetParticipant.name;

    return (
      smsReminderTemplate(
        false,
        eventDetails.organizer.language.locale,
        actionType,
        eventDetails.organizer.timeFormat,
        eventDetails.startTime,
        eventDetails.title,
        recipientTimezone,
        organizerName,
        recipientName
      ) || messageTemplate
    );
  }

  return messageTemplate;
};

const executeImmediateNotification = async (
  phoneDestination: string,
  textContent: string,
  senderIdentifier: string,
  userRef?: number | null,
  teamRef?: number | null,
  eventTypeRef?: number
): Promise<void> => {
  try {
    await twilio.sendSMS(
      phoneDestination,
      textContent,
      senderIdentifier,
      userRef,
      teamRef,
      false,
      undefined,
      undefined,
      { eventTypeId: eventTypeRef }
    );
  } catch (exception) {
    moduleLogger.error(`Immediate SMS delivery failed: ${exception}`);
  }
};

const scheduleDelayedNotification = async (
  phoneDestination: string,
  textContent: string,
  dispatchTime: dayjs.Dayjs,
  senderIdentifier: string,
  bookingReference: string,
  stepReference: number,
  seatReference?: string | null,
  userRef?: number | null,
  teamRef?: number | null,
  eventTypeRef?: number | null
): Promise<void> => {
  try {
    const scheduledMessage = await twilio.scheduleSMS(
      phoneDestination,
      textContent,
      dispatchTime.toDate(),
      senderIdentifier,
      userRef,
      teamRef,
      false,
      undefined,
      undefined,
      { eventTypeId: eventTypeRef }
    );

    if (scheduledMessage) {
      await prisma.calIdWorkflowReminder.create({
        data: {
          bookingUid: bookingReference,
          workflowStepId: stepReference,
          method: WorkflowMethods.SMS,
          scheduledDate: dispatchTime.toDate(),
          scheduled: true,
          referenceId: scheduledMessage.sid,
          seatReferenceId: seatReference,
        },
      });
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
  seatReference?: string | null,
  userRef?: number | null,
  teamRef?: number | null,
  eventTypeRef?: number | null
): Promise<void> => {
  const currentMoment = dayjs();
  const minimumAdvanceTime = currentMoment.add(1, "hour");
  const maximumAdvanceTime = currentMoment.add(7, "day");

  if (currentMoment.isBefore(dispatchTime.subtract(1, "hour")) && !dispatchTime.isAfter(maximumAdvanceTime)) {
    await scheduleDelayedNotification(
      phoneDestination,
      textContent,
      dispatchTime,
      senderIdentifier,
      bookingReference,
      stepReference,
      seatReference,
      userRef,
      teamRef,
      eventTypeRef
    );
  } else if (dispatchTime.isAfter(maximumAdvanceTime)) {
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
    workflowTemplate,
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
      userReference,
      teamReference,
      eventData.eventType.id
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
        seatReference,
        userReference,
        teamReference,
        eventData.eventTypeId
      );
    } else {
      moduleLogger.error("stepReference is undefined when scheduling SMS reminder.");
    }
  }
};

export const deleteScheduledSMSReminder = async (
  reminderIdentifier: number,
  externalReference: string | null
): Promise<void> => {
  try {
    await prisma.calIdWorkflowReminder.update({
      where: { id: reminderIdentifier },
      data: { cancelled: true },
    });
  } catch (exception) {
    moduleLogger.error(`Reminder cancellation failed: ${exception}`);
  }
};
