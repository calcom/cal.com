import dayjs from "@calcom/dayjs";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions } from "@calcom/prisma/enums";

interface ReminderTemplateConfiguration {
  designMode: boolean;
  cultureCode: string;
  operationType?: WorkflowActions;
  clockStyle?: TimeFormat;
  eventStart?: string;
  meetingName?: string;
  timeRegion?: string;
  attendeeReference?: string;
  ownerName?: string;
}

const MESSAGE_SIZE_LIMIT = 1024;

const resolveTimeFormatting = (providedFormat?: TimeFormat): TimeFormat => {
  return providedFormat || TimeFormat.TWELVE_HOUR;
};

const buildDateTimeTemplate = (clockFormat: TimeFormat): string => {
  return `ddd, MMM D, YYYY ${clockFormat}`;
};

const constructEditingPlaceholders = (
  clockFormat: TimeFormat,
  datePattern: string,
  operationType?: WorkflowActions
) => {
  const timeVariable = `{START_TIME_${clockFormat}}`;
  const dateVariable = `{EVENT_DATE_${datePattern}}`;
  const titleVariable = "{EVENT_NAME}";
  const timezoneVariable = "{TIMEZONE}";

  const isParticipantFlow = operationType === WorkflowActions.WHATSAPP_ATTENDEE;
  const attendeeVariable = isParticipantFlow ? "{ORGANIZER}" : "{ATTENDEE}";
  const hostVariable = isParticipantFlow ? "{ATTENDEE}" : "{ORGANIZER}";

  return {
    start: timeVariable,
    dateStr: dateVariable,
    title: titleVariable,
    zone: timezoneVariable,
    participant: attendeeVariable,
    displayName: hostVariable,
  };
};

const calculateRealTimeValues = (
  eventStartTime: string,
  timezoneInfo: string,
  localeInfo: string,
  formatType: TimeFormat
) => {
  const dateProcessor = dayjs(eventStartTime).tz(timezoneInfo).locale(localeInfo);

  return {
    computedDate: dateProcessor.format("YYYY MMM D"),
    computedTime: dateProcessor.format(formatType),
  };
};

const generateReminderNotification = (
  recipientName: string,
  eventTitle: string,
  otherParty: string,
  eventDate: string,
  eventTime: string,
  timezone: string
): string => {
  const userAddress = recipientName || "user";

  return `Hi ${userAddress}, this is a reminder that your meeting (*${eventTitle}*) with ${otherParty} is on ${eventDate} at ${eventTime} ${timezone}.`;
};

const validateMessageSize = (messageText: string): string | null => {
  return messageText.length <= MESSAGE_SIZE_LIMIT ? messageText : null;
};

const processReminderData = (config: ReminderTemplateConfiguration) => {
  const selectedFormat = resolveTimeFormatting(config.clockStyle);
  const templatePattern = buildDateTimeTemplate(selectedFormat);

  if (config.designMode) {
    return constructEditingPlaceholders(selectedFormat, templatePattern, config.operationType);
  }

  const { computedDate, computedTime } = calculateRealTimeValues(
    config.eventStart!,
    config.timeRegion!,
    config.cultureCode,
    selectedFormat
  );

  return {
    start: computedTime,
    dateStr: computedDate,
    title: config.meetingName,
    zone: config.timeRegion,
    participant: config.attendeeReference,
    displayName: config.ownerName,
  };
};

export const whatsappReminderTemplate = (
  editMode: boolean,
  lang: string,
  act?: WorkflowActions,
  fmt?: TimeFormat,
  start?: string,
  title?: string,
  zone?: string,
  participant?: string,
  displayName?: string
): string | null => {
  const templateConfig: ReminderTemplateConfiguration = {
    designMode: editMode,
    cultureCode: lang,
    operationType: act,
    clockStyle: fmt,
    eventStart: start,
    meetingName: title,
    timeRegion: zone,
    attendeeReference: participant,
    ownerName: displayName,
  };

  const processedValues = processReminderData(templateConfig);

  const reminderMessage = generateReminderNotification(
    processedValues.displayName || "user",
    processedValues.title || "",
    processedValues.participant || "",
    processedValues.dateStr || "",
    processedValues.start || "",
    processedValues.zone || ""
  );

  return validateMessageSize(reminderMessage);
};
