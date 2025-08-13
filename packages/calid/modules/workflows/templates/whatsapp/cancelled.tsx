import dayjs from "@calcom/dayjs";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions } from "@calcom/prisma/enums";

interface TemplateConfiguration {
  editMode: boolean;
  userLocale: string;
  workflowAction?: WorkflowActions;
  clockFormat?: TimeFormat;
  appointmentStart?: string;
  meetingTitle?: string;
  timezoneData?: string;
  participantName?: string;
  hostName?: string;
}

const MAXIMUM_MESSAGE_LENGTH = 1024;

const determineClockFormat = (providedFormat?: TimeFormat): TimeFormat => {
  return providedFormat || TimeFormat.TWELVE_HOUR;
};

const constructDateTimePattern = (clockFormat: TimeFormat): string => {
  return `ddd, MMM D, YYYY ${clockFormat}`;
};

const generatePlaceholderValues = (
  clockFormat: TimeFormat,
  datePattern: string,
  workflowAction?: WorkflowActions
) => {
  const timeFormatPlaceholder = `{START_TIME_${clockFormat}}`;
  const datePlaceholder = `{EVENT_DATE_${datePattern}}`;
  const titlePlaceholder = "{EVENT_NAME}";
  const timezonePlaceholder = "{TIMEZONE}";

  const isAttendeeAction = workflowAction === WorkflowActions.WHATSAPP_ATTENDEE;
  const participantPlaceholder = isAttendeeAction ? "{ORGANIZER}" : "{ATTENDEE}";
  const hostPlaceholder = isAttendeeAction ? "{ATTENDEE}" : "{ORGANIZER}";

  return {
    startTime: timeFormatPlaceholder,
    eventDate: datePlaceholder,
    eventName: titlePlaceholder,
    timeZone: timezonePlaceholder,
    attendee: participantPlaceholder,
    name: hostPlaceholder,
  };
};

const formatActualValues = (
  startTimeString: string,
  timezoneString: string,
  localeString: string,
  clockFormat: TimeFormat
) => {
  const momentInstance = dayjs(startTimeString).tz(timezoneString).locale(localeString);

  return {
    formattedDate: momentInstance.format("YYYY MMM D"),
    formattedTime: momentInstance.format(clockFormat),
  };
};

const buildCancellationMessage = (
  recipientName: string,
  meetingTitle: string,
  otherParticipant: string,
  eventDate: string,
  eventTime: string,
  timezone: string
): string => {
  const greeting = recipientName ? `${recipientName}` : "user";

  return `Hi ${greeting}, your meeting (*${meetingTitle}*) with ${otherParticipant} on ${eventDate} at ${eventTime} ${timezone} has been canceled.`;
};

const validateMessageLength = (messageContent: string): string | null => {
  return messageContent.length <= MAXIMUM_MESSAGE_LENGTH ? messageContent : null;
};

const processTemplateData = (config: TemplateConfiguration) => {
  const selectedClockFormat = determineClockFormat(config.clockFormat);
  const dateTimePattern = constructDateTimePattern(selectedClockFormat);

  if (config.editMode) {
    return generatePlaceholderValues(selectedClockFormat, dateTimePattern, config.workflowAction);
  }

  const { formattedDate, formattedTime } = formatActualValues(
    config.appointmentStart!,
    config.timezoneData!,
    config.userLocale,
    selectedClockFormat
  );

  return {
    startTime: formattedTime,
    eventDate: formattedDate,
    eventName: config.meetingTitle,
    timeZone: config.timezoneData,
    attendee: config.participantName,
    name: config.hostName,
  };
};

export const whatsappEventCancelledTemplate = (
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
  const templateConfig: TemplateConfiguration = {
    editMode: isEditingMode,
    userLocale: locale,
    workflowAction: action,
    clockFormat: timeFormat,
    appointmentStart: startTime,
    meetingTitle: eventName,
    timezoneData: timeZone,
    participantName: attendee,
    hostName: name,
  };

  const processedData = processTemplateData(templateConfig);

  const messageContent = buildCancellationMessage(
    processedData.name || "user",
    processedData.eventName || "",
    processedData.attendee || "",
    processedData.eventDate || "",
    processedData.startTime || "",
    processedData.timeZone || ""
  );

  return validateMessageLength(messageContent);
};
