import dayjs from "@calcom/dayjs";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions } from "@calcom/prisma/enums";

interface ReschedulingNotificationData {
  modificationMode: boolean;
  languageCode: string;
  workflowType?: WorkflowActions;
  displayTimeFormat?: TimeFormat;
  appointmentTimestamp?: string;
  sessionName?: string;
  regionalTimezone?: string;
  participantInfo?: string;
  organizerInfo?: string;
}

const CONTENT_LENGTH_BOUNDARY = 1024;

const determineTimeFormat = (suppliedFormat?: TimeFormat): TimeFormat => {
  return suppliedFormat ?? TimeFormat.TWELVE_HOUR;
};

const createDateTimeStructure = (timeFormat: TimeFormat): string => {
  return `ddd, MMM D, YYYY ${timeFormat}`;
};

const buildModificationTokens = (
  timeFormat: TimeFormat,
  dateStructure: string,
  workflowType?: WorkflowActions
) => {
  const timeToken = `{START_TIME_${timeFormat}}`;
  const dateToken = `{EVENT_DATE_${dateStructure}}`;
  const nameToken = "{EVENT_NAME}";
  const zoneToken = "{TIMEZONE}";

  const isAttendeeWorkflow = workflowType === WorkflowActions.WHATSAPP_ATTENDEE;
  const participantToken = isAttendeeWorkflow ? "{ORGANIZER}" : "{ATTENDEE}";
  const userToken = isAttendeeWorkflow ? "{ATTENDEE}" : "{ORGANIZER}";

  return {
    startTime: timeToken,
    eventDate: dateToken,
    eventName: nameToken,
    timeZone: zoneToken,
    attendee: participantToken,
    name: userToken,
  };
};

const computeActualTimestamps = (
  timestampString: string,
  timezoneString: string,
  localeString: string,
  timeFormat: TimeFormat
) => {
  const momentObject = dayjs(timestampString).tz(timezoneString).locale(localeString);

  return {
    renderedDate: momentObject.format("YYYY MMM D"),
    renderedTime: momentObject.format(timeFormat),
  };
};

const constructReschedulingMessage = (
  recipientName: string,
  meetingTitle: string,
  counterparty: string,
  meetingDate: string,
  meetingTime: string,
  timezone: string
): string => {
  const addresseeName = recipientName || "user";

  return `Hi ${addresseeName}, your meeting (*${meetingTitle}*) with ${counterparty} on ${meetingDate} at ${meetingTime} ${timezone} has been rescheduled.`;
};

const checkContentLength = (messageContent: string): string | null => {
  return messageContent.length <= CONTENT_LENGTH_BOUNDARY ? messageContent : null;
};

const assembleNotificationData = (config: ReschedulingNotificationData) => {
  const selectedTimeFormat = determineTimeFormat(config.displayTimeFormat);
  const dateTimeStructure = createDateTimeStructure(selectedTimeFormat);

  if (config.modificationMode) {
    return buildModificationTokens(selectedTimeFormat, dateTimeStructure, config.workflowType);
  }

  const { renderedDate, renderedTime } = computeActualTimestamps(
    config.appointmentTimestamp!,
    config.regionalTimezone!,
    config.languageCode,
    selectedTimeFormat
  );

  return {
    startTime: renderedTime,
    eventDate: renderedDate,
    eventName: config.sessionName,
    timeZone: config.regionalTimezone,
    attendee: config.participantInfo,
    name: config.organizerInfo,
  };
};

export const whatsappEventRescheduledTemplate = (
  isEditingMode: boolean,
  locale: string,
  action?: WorkflowActions,
  timeFormat?: TimeFormat,
  startTime?: string,
  eventName?: string,
  timeZone?: string,
  attendee?: string,
  name?: string
) => {
  const notificationConfig: ReschedulingNotificationData = {
    modificationMode: isEditingMode,
    languageCode: locale,
    workflowType: action,
    displayTimeFormat: timeFormat,
    appointmentTimestamp: startTime,
    sessionName: eventName,
    regionalTimezone: timeZone,
    participantInfo: attendee,
    organizerInfo: name,
  };

  const templateData = assembleNotificationData(notificationConfig);

  const notificationText = constructReschedulingMessage(
    templateData.name || "user",
    templateData.eventName || "",
    templateData.attendee || "",
    templateData.eventDate || "",
    templateData.startTime || "",
    templateData.timeZone || ""
  );

  return checkContentLength(notificationText);
};
