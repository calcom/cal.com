// whatsappManager.ts
import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { WEBSITE_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { WorkflowTemplates } from "@calcom/prisma/enums";
import {
  WorkflowTriggerEvents,
  WorkflowActions,
  WorkflowMethods,
  WorkflowStatus,
} from "@calcom/prisma/enums";

import type { timeUnitLowerCase } from "../config/constants";
import type { CalIdAttendeeInBookingInfo, CalIdBookingInfo } from "../config/types";
import type { CalIdScheduleWhatsAppReminderAction } from "../config/types";
import type { CalIdScheduleWhatsAppReminderArgs } from "../config/types";
import { deleteScheduledSMSReminder } from "../managers/smsManager";
import * as meta from "../providers/meta";
import type { VariablesType } from "../templates/customTemplate";
import { constructVariablesForTemplate } from "./constructTemplateVariable";

const log = logger.getSubLogger({ prefix: ["[whatsappManager]"] });

const getCurrentTime = ({
  time,
  timeUnit,
}: {
  time?: number | null;
  timeUnit?: string | null;
}): Dayjs | null => {
  const normalizedUnit = timeUnit?.toLocaleLowerCase() as timeUnitLowerCase;
  if (time && normalizedUnit) {
    return dayjs().add(time, normalizedUnit);
  }
  return dayjs();
};

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
      return dayjs().add(time, normalizedUnit);
    case WorkflowTriggerEvents.EVENT_CANCELLED:
      return dayjs().add(time, normalizedUnit);
    case WorkflowTriggerEvents.RESCHEDULE_EVENT:
      return dayjs().add(time, normalizedUnit);
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

// REVIEW: Here only for reference on what params are set as what on meta
// const buildContentVariables = (
//   reminderData: ContentVariableInput,
//   participantName: string,
//   hostName: string,
//   timeZoneInfo: string
// ): Record<number, string> => {
//   const { workflowStep, booking } = reminderData;

//   const formatTimestamp = (timestamp?: Date, formatString?: string) =>
//     dayjs(timestamp?.toISOString() || "")
//       .tz(timeZoneInfo)
//       .locale(booking?.user?.locale || "en")
//       .format(formatString || "YYYY MMM D");

//   const variableMapping = {
//     1: workflowStep?.action === WorkflowActions.WHATSAPP_ATTENDEE ? "participantName" : "organizerName",
//     2: "eventName",
//     3: workflowStep?.action === WorkflowActions.WHATSAPP_ATTENDEE ? "organizerName" : "participantName",
//     4: "eventTimeInAttendeeTimezone", // REVIEW: This one was without timezone
//     5: "eventTimeInAttendeeTimezone",
//   };

//   return variableMapping;

//   // switch (workflowStep?.template) {
//   //   case WorkflowTemplates.REMINDER:
//   //   case WorkflowTemplates.CANCELLED:
//   //   case WorkflowTemplates.RESCHEDULED:
//   //     return variableMapping;
//   //   case WorkflowTemplates.COMPLETED:
//   //     return {
//   //       1: variableMapping[1],
//   //       2: variableMapping[2],
//   //       3: variableMapping[4],
//   //       4: variableMapping[5],
//   //     };
//   //   default:
//   //     return {};
//   // }
// };

const executeImmediateWhatsapp = async ({
  eventTypeId,
  workflowId,
  reminderPhone,
  action,
  template,
  evt,
  timeZone,
  variableData,
  userId,
  teamId,
  metaTemplateName,
  metaPhoneNumberId,

  uid,
  workflowStepId,
  currentTime,
  seatReferenceUid,
}: {
  eventTypeId?: number | null;
  workflowId?: number;
  reminderPhone: string;
  action: WorkflowActions;
  template?: WorkflowTemplates | null;
  evt: CalIdBookingInfo;
  timeZone: string;
  variableData: VariablesType;
  userId?: number | null;
  teamId?: number | null;
  metaTemplateName?: string | null;
  metaPhoneNumberId?: string | null;

  uid: string;
  workflowStepId: number | undefined;
  currentTime: Dayjs;
  seatReferenceUid: string | undefined;
}): Promise<void> => {
  try {
    const response = await meta.sendSMS({
      eventTypeId,
      workflowId,
      phoneNumber: reminderPhone,
      userId,
      teamId,
      template,
      variableData,
      metaTemplateName,
      metaPhoneNumberId,
    });

    await prisma.calIdWorkflowReminder.create({
      data: {
        bookingUid: uid,
        workflowStepId: workflowStepId,
        method: WorkflowMethods.WHATSAPP,
        scheduledDate: currentTime,
        scheduled: true,
        seatReferenceId: seatReferenceUid,
        ...(evt.attendees[0].id && { attendeeId: evt.attendees[0].id }),
      },
    });

    if (response?.messageId) {
      await prisma.calIdWorkflowInsights.create({
        data: {
          workflowId,
          msgId: response?.messageId,
          eventTypeId: Number(eventTypeId),
          type: WorkflowMethods.WHATSAPP,
          status: WorkflowStatus.QUEUED,
        },
      });
    }
  } catch (error) {
    console.log(`Error sending WHATSAPP with error ${error}`);
    console.log(error.stack);
  }
};

const scheduleDelayedWhatsapp = async ({
  eventTypeId,
  workflowId,
  reminderPhone,
  scheduledDate,
  action,
  template,
  evt,
  timeZone,
  uid,
  workflowStepId,
  seatReferenceUid,
  variableData,
  userId,
  teamId,
  metaTemplateName,
  metaPhoneNumberId,
}: {
  eventTypeId: number;
  workflowId: number | null;
  reminderPhone: string;
  scheduledDate: Dayjs;
  action: WorkflowActions;
  template: WorkflowTemplates | undefined;
  evt: CalIdBookingInfo;
  timeZone: string;
  uid: string;
  workflowStepId: number | undefined;
  seatReferenceUid: string | undefined;
  variableData: VariablesType;
  userId?: number | null;
  teamId?: number | null;
  metaTemplateName?: string | null;
  metaPhoneNumberId?: string | null;
}): Promise<void> => {
  try {
    const scheduledWHATSAPP = await meta.scheduleSMS({
      eventTypeId,
      workflowId,
      scheduledDate: scheduledDate.toDate(),
      phoneNumber: reminderPhone,
      userId,
      teamId,
      template,
      variableData,
      metaTemplateName,
      metaPhoneNumberId,
      workflowStepId,
      bookingUid: uid,
    });

    // if (scheduledWHATSAPP) {
    //   await prisma.calIdWorkflowReminder.create({
    //     data: {
    //       bookingUid: uid,
    //       workflowStepId: workflowStepId,
    //       method: WorkflowMethods.WHATSAPP,
    //       scheduledDate: scheduledDate.toDate(),
    //       scheduled: true,
    //       referenceId: scheduledWHATSAPP.sid,
    //       seatReferenceId: seatReferenceUid,
    //       ...(evt.attendees[0].id && { attendeeId: evt.attendees[0].id }),
    //     },
    //   });
    // }
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

const processScheduledWhatsapp = async ({
  eventTypeId,
  workflowId,
  reminderPhone,
  scheduledDate,
  action,
  template,
  evt,
  timeZone,
  uid,
  variableData,
  workflowStepId,
  seatReferenceUid,
  userId,
  teamId,
  metaTemplateName,
  metaPhoneNumberId,
}: {
  eventTypeId: number;
  workflowId?: number;
  reminderPhone: string;
  scheduledDate: Dayjs;
  action: WorkflowActions;
  template: WorkflowTemplates | undefined;
  evt: any;
  timeZone: string;
  variableData: VariablesType;
  uid: string;
  workflowStepId: number | undefined;
  seatReferenceUid: string | undefined;
  userId?: number | null;
  teamId?: number | null;
  metaTemplateName?: string | null;
  metaPhoneNumberId?: string | null;
}): Promise<void> => {
  const currentDate = dayjs();

  // Can only schedule at least 60 minutes in advance and at most 7 days in advance with inngest rest are handled via crons

  if (!scheduledDate.isAfter(currentDate.add(7, "day"))) {
    await scheduleDelayedWhatsapp({
      eventTypeId,
      workflowId,
      reminderPhone,
      scheduledDate,
      action,
      template,
      evt,
      timeZone,
      uid,
      workflowStepId,
      variableData,
      seatReferenceUid,
      userId,
      teamId,
      metaTemplateName,
      metaPhoneNumberId,
    });
  } else if (scheduledDate.isAfter(currentDate.add(7, "day"))) {
    await storeFutureWhatsappReminder(uid, workflowStepId, scheduledDate, seatReferenceUid, evt);
  }
};

interface RecipientConfiguration {
  targetName: string;
  targetPhone: string | null;
  participantInfo: CalIdAttendeeInBookingInfo | null;
  participantName: string;
  targetTimezone: string;
}

const resolveRecipientDetails = (
  workflowAction: CalIdScheduleWhatsAppReminderAction,
  eventData: CalIdBookingInfo,
  recipientTarget: string
): RecipientConfiguration => {
  let targetName = "";
  let targetPhone: string | null = null;
  let participantInfo: CalIdAttendeeInBookingInfo | null = null;
  let participantName = "";
  let targetTimezone = "";

  switch (workflowAction) {
    case WorkflowActions.WHATSAPP_NUMBER:
      targetName = "";
      participantInfo = eventData.attendees[0];
      participantName = eventData.attendees[0].name;
      targetTimezone = eventData.organizer.timeZone;
      break;

    case WorkflowActions.WHATSAPP_ATTENDEE:
      targetPhone = recipientTarget;

      const matchingAttendee = eventData.attendees.find((attendee) => attendee.phoneNumber === targetPhone);
      participantInfo = matchingAttendee || eventData.attendees[0];
      targetName = participantInfo.name;
      participantName = eventData.organizer.name;
      targetTimezone = participantInfo.timeZone;
      break;
  }

  return {
    targetName,
    targetPhone,
    participantInfo,
    participantName,
    targetTimezone,
  };
};

export const scheduleWhatsappReminder = async (args: CalIdScheduleWhatsAppReminderArgs) => {
  const {
    evt,
    workflow,
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
    metaTemplateName,
    metaPhoneNumberId,
  } = args;

  const { startTime, endTime } = evt;
  const uid = evt.uid as string;

  // Always calculate scheduled date, even for traditionally immediate events
  const scheduledDate = calculateScheduledDateTime(triggerEvent, startTime, endTime, {
    time: timeSpan.time,
    timeUnit: timeSpan.timeUnit,
  });

  const currentTime = getCurrentTime({
    time: timeSpan.time,
    timeUnit: timeSpan.timeUnit,
  });

  const recipientConfiguration = resolveRecipientDetails(action, evt, reminderPhone);

  const { targetName, participantInfo, participantName, targetTimezone } = recipientConfiguration;

  const bookerBaseUrl = evt.bookerUrl ?? WEBSITE_URL;

  const templateVariables = constructVariablesForTemplate(
    evt,
    participantInfo!,
    startTime,
    endTime,
    targetTimezone,
    bookerBaseUrl || WEBSITE_URL
  );

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

  // const textMessage = generateTextMessage(template, message, evt, action, name, attendeeName, timeZone);

  // Allows debugging generated whatsapp content without waiting for meta to send whatsapp messages
  // log.debug(`Sending Whatsapp for trigger ${triggerEvent}`, textMessage);

  if (!reminderPhone && !isNumberVerified) return;

  // Determine if this should be immediate or scheduled based on timestamp availability
  const shouldSendImmediately = !scheduledDate || (scheduledDate && scheduledDate.isBefore(dayjs()));

  console.log("send immediately: ", shouldSendImmediately, metaTemplateName, metaPhoneNumberId);

  if (shouldSendImmediately) {
    // Send immediately for all trigger types when no valid future timestamp exists
    console.log("sending values: ", {
      eventTypeId: evt.eventTypeId,
      workflowId: workflow.id,
    });
    await executeImmediateWhatsapp({
      eventTypeId: evt.eventTypeId,
      workflowId: workflow.id,
      reminderPhone,
      action,
      template,
      evt,
      variableData: templateVariables,
      timeZone,
      userId,
      teamId,
      metaTemplateName,
      metaPhoneNumberId,
      uid,
      workflowStepId,
      currentTime,
      seatReferenceUid,
    });
  } else {
    // Schedule for future delivery when valid timestamp exists
    await processScheduledWhatsapp({
      eventTypeId: evt.eventType.id,
      workflowId: workflow.id,
      reminderPhone,
      scheduledDate,
      action,
      variableData: templateVariables,
      template,
      evt,
      timeZone,
      uid,
      workflowStepId,
      seatReferenceUid,
      userId,
      teamId,
      metaTemplateName,
      metaPhoneNumberId,
    });
  }
};

export const deleteScheduledWhatsappReminder = deleteScheduledSMSReminder;
