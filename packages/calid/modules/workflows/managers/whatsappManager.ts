import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import logger from "@calcom/lib/logger";
import { TimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import {
  WorkflowTriggerEvents,
  WorkflowTemplates,
  WorkflowActions,
  WorkflowMethods,
} from "@calcom/prisma/enums";

import type { timeUnitLowerCase } from "../config/constants";
import type { CalIdScheduleTextReminderArgs } from "../config/types";
import { deleteScheduledSMSReminder } from "../managers/smsManager";
import * as twilio from "../providers/twilio";
import {
  whatsappEventCancelledTemplate,
  whatsappEventCompletedTemplate,
  whatsappEventRescheduledTemplate,
  whatsappReminderTemplate,
} from "../templates/whatsapp";

const log = logger.getSubLogger({ prefix: ["[whatsappReminderManager]"] });

const calculateScheduledDateTime = (
  triggerType: WorkflowTriggerEvents,
  eventStartTime: string,
  eventEndTime: string,
  timeConfiguration: { time?: number | null; timeUnit?: string | null }
): Dayjs | null => {
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

const validateNumberVerification = async (
  action: WorkflowActions,
  phoneNumber: string | null,
  userId?: number | null,
  teamId?: number | null,
  isVerificationPending = false
): Promise<boolean> => {
  // WHATSAPP_ATTENDEE action does not need to be verified
  // isVerificationPending is from all already existing workflows (once they edit their workflow, they will also have to verify the number)
  if (action === WorkflowActions.WHATSAPP_ATTENDEE) return true;

  const verifiedNumber = await prisma.verifiedNumber.findFirst({
    where: {
      OR: [{ userId }, { calIdTeamId: teamId }],
      phoneNumber: phoneNumber || "",
    },
  });

  if (!!verifiedNumber) return true;
  return isVerificationPending;
};

const generateTextMessage = (
  template: WorkflowTemplates | undefined,
  message: string,
  evt: any,
  action: WorkflowActions,
  name: string,
  attendeeName: string,
  timeZone: string
): string => {
  let textMessage = message;

  switch (template) {
    case WorkflowTemplates.REMINDER:
      textMessage =
        whatsappReminderTemplate(
          false,
          evt.organizer.language.locale,
          action,
          evt.organizer.timeFormat,
          evt.startTime,
          evt.eventType.title ?? evt.title,
          timeZone,
          attendeeName.split(" ")[0],
          name
        ) || message;
      break;
    case WorkflowTemplates.CANCELLED:
      textMessage =
        whatsappEventCancelledTemplate(
          false,
          evt.organizer.language.locale,
          action,
          evt.organizer.timeFormat,
          evt.startTime,
          evt.eventType.title,
          timeZone,
          attendeeName.split(" ")[0],
          name
        ) || message;
      break;
    case WorkflowTemplates.RESCHEDULED:
      textMessage =
        whatsappEventRescheduledTemplate(
          false,
          evt.organizer.language.locale,
          action,
          evt.organizer.timeFormat,
          evt.startTime,
          evt.eventType.title,
          timeZone,
          attendeeName.split(" ")[0],
          name
        ) || message;
      break;
    case WorkflowTemplates.COMPLETED:
      textMessage =
        whatsappEventCompletedTemplate(
          false,
          evt.organizer.language.locale,
          action,
          evt.organizer.timeFormat,
          evt.startTime,
          evt.eventType.title ?? evt.title,
          timeZone,
          attendeeName.split(" ")[0],
          name
        ) || message;
      break;
    default:
      textMessage =
        whatsappReminderTemplate(
          false,
          evt.organizer.language.locale,
          action,
          evt.organizer.timeFormat,
          evt.startTime,
          evt.eventType.title ?? evt.title,
          timeZone,
          attendeeName,
          name
        ) || message;
  }

  return textMessage;
};

const executeImmediateWhatsapp = async (
  reminderPhone: string,
  textMessage: string,
  action: WorkflowActions,
  template: WorkflowTemplates | undefined,
  evt: any,
  timeZone: string,
  userId?: number | null,
  teamId?: number | null
): Promise<void> => {
  try {
    const contentVars = twilio.generateContentVars(
      {
        workflowStep: {
          action: action,
          template: template,
        },
        booking: {
          eventType: { title: evt.eventType.title ?? evt.title },
          user: {
            locale: evt.organizer.language.locale,
            timeFormat: evt.organizer.timeFormat === TimeFormat.TWENTY_FOUR_HOUR ? 24 : 12,
          },
          startTime: new Date(evt.startTime),
        },
      },
      evt.attendees[0].name || "",
      evt.organizer.name || "",
      timeZone || ""
    );

    await twilio.sendSMS(
      reminderPhone,
      textMessage,
      "",
      userId,
      teamId,
      true,
      template,
      JSON.stringify(contentVars),
      {
        eventTypeId: evt.eventType.id,
      }
    );
  } catch (error) {
    console.log(`Error sending WHATSAPP with error ${error}`);
  }
};

const scheduleDelayedWhatsapp = async (
  reminderPhone: string,
  scheduledDate: Dayjs,
  action: WorkflowActions,
  template: WorkflowTemplates | undefined,
  evt: any,
  timeZone: string,
  uid: string,
  workflowStepId: number | undefined,
  seatReferenceUid: string | undefined,
  userId?: number | null,
  teamId?: number | null
): Promise<void> => {
  try {
    const contentVars = twilio.generateContentVars(
      {
        workflowStep: {
          action: action,
          template: template,
        },
        booking: {
          eventType: { title: evt.eventType.title ?? evt.title },
          user: {
            locale: evt.organizer.language.locale,
            timeFormat: evt.organizer.timeFormat === TimeFormat.TWENTY_FOUR_HOUR ? 24 : 12,
          },
          startTime: new Date(evt.startTime),
        },
      },
      evt.attendees[0].name || "",
      evt.organizer.name || "",
      timeZone || ""
    );

    const scheduledWHATSAPP = await twilio.scheduleSMS(
      reminderPhone,
      "",
      scheduledDate.toDate(),
      "",
      userId,
      teamId,
      true,
      template,
      JSON.stringify(contentVars),
      {
        eventTypeId: evt.eventType.id,
      }
    );

    if (scheduledWHATSAPP) {
      await prisma.calIdWorkflowReminder.create({
        data: {
          bookingUid: uid,
          workflowStepId: workflowStepId,
          method: WorkflowMethods.WHATSAPP,
          scheduledDate: scheduledDate.toDate(),
          scheduled: true,
          referenceId: scheduledWHATSAPP.sid,
          seatReferenceId: seatReferenceUid,
          ...(evt.attendees[0].id && { attendeeId: evt.attendees[0].id }),
        },
      });
    }
  } catch (error) {
    console.log(`Error scheduling WHATSAPP with error ${error}`);
  }
};

const storeFutureWhatsappReminder = async (
  uid: string,
  workflowStepId: number | undefined,
  scheduledDate: Dayjs,
  seatReferenceUid: string | undefined,
  evt: any
): Promise<void> => {
  // Write to DB and send to CRON if scheduled reminder date is past 7 days
  await prisma.calIdWorkflowReminder.create({
    data: {
      bookingUid: uid,
      workflowStepId: workflowStepId,
      method: WorkflowMethods.WHATSAPP,
      scheduledDate: scheduledDate.toDate(),
      scheduled: false,
      seatReferenceId: seatReferenceUid,
      ...(evt.attendees[0].id && { attendeeId: evt.attendees[0].id }),
    },
  });
};

const processScheduledWhatsapp = async (
  reminderPhone: string,
  scheduledDate: Dayjs,
  action: WorkflowActions,
  template: WorkflowTemplates | undefined,
  evt: any,
  timeZone: string,
  uid: string,
  workflowStepId: number | undefined,
  seatReferenceUid: string | undefined,
  userId?: number | null,
  teamId?: number | null
): Promise<void> => {
  const currentDate = dayjs();

  // Can only schedule at least 60 minutes in advance and at most 7 days in advance
  if (
    currentDate.isBefore(scheduledDate.subtract(1, "hour")) &&
    !scheduledDate.isAfter(currentDate.add(7, "day"))
  ) {
    await scheduleDelayedWhatsapp(
      reminderPhone,
      scheduledDate,
      action,
      template,
      evt,
      timeZone,
      uid,
      workflowStepId,
      seatReferenceUid,
      userId,
      teamId
    );
  } else if (scheduledDate.isAfter(currentDate.add(7, "day"))) {
    await storeFutureWhatsappReminder(uid, workflowStepId, scheduledDate, seatReferenceUid, evt);
  }
};

export const scheduleWhatsappReminder = async (args: CalIdScheduleTextReminderArgs) => {
  const {
    evt,
    reminderPhone,
    triggerEvent,
    action,
    timeSpan,
    message = "",
    workflowStepId,
    template,
    userId,
    calIdTeamId: teamId,
    isVerificationPending = false,
    seatReferenceUid,
  } = args;

  const { startTime, endTime } = evt;
  const uid = evt.uid as string;

  // Always calculate scheduled date, even for traditionally immediate events
  const scheduledDate = calculateScheduledDateTime(triggerEvent, startTime, endTime, {
    time: timeSpan.time,
    timeUnit: timeSpan.timeUnit,
  });

  const isNumberVerified = await validateNumberVerification(
    action,
    reminderPhone,
    userId,
    teamId,
    isVerificationPending
  );

  const name = action === WorkflowActions.WHATSAPP_ATTENDEE ? evt.attendees[0].name : evt.organizer.name;
  const attendeeName =
    action === WorkflowActions.WHATSAPP_ATTENDEE ? evt.organizer.name : evt.attendees[0].name;
  const timeZone =
    action === WorkflowActions.WHATSAPP_ATTENDEE ? evt.attendees[0].timeZone : evt.organizer.timeZone;

  const textMessage = generateTextMessage(template, message, evt, action, name, attendeeName, timeZone);

  // Allows debugging generated whatsapp content without waiting for twilio to send whatsapp messages
  log.debug(`Sending Whatsapp for trigger ${triggerEvent}`, textMessage);

  if (textMessage.length === 0 || !reminderPhone || !isNumberVerified) return;

  // Determine if this should be immediate or scheduled based on timestamp availability
  const shouldSendImmediately =
    !scheduledDate ||
    (scheduledDate && (scheduledDate.isBefore(dayjs()) || scheduledDate.isSame(dayjs(), "minute")));

  if (shouldSendImmediately) {
    // Send immediately for all trigger types when no valid future timestamp exists
    await executeImmediateWhatsapp(
      reminderPhone,
      textMessage,
      action,
      template,
      evt,
      timeZone,
      userId,
      teamId
    );
  } else {
    // Schedule for future delivery when valid timestamp exists
    await processScheduledWhatsapp(
      reminderPhone,
      scheduledDate,
      action,
      template,
      evt,
      timeZone,
      uid,
      workflowStepId,
      seatReferenceUid,
      userId,
      teamId
    );
  }
};

export const deleteScheduledWhatsappReminder = deleteScheduledSMSReminder;
