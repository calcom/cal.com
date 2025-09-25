import dayjs from "@calcom/dayjs";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions } from "@calcom/prisma/enums";

interface CompletionMessageParams {
  previewMode: boolean;
  regionLocale: string;
  actionType?: WorkflowActions;
  timeDisplayFormat?: TimeFormat;
  scheduledTimestamp?: string;
  sessionTitle?: string;
  locationTimezone?: string;
  guestIdentity?: string;
  organizerIdentity?: string;
}

const CHARACTER_LIMIT_THRESHOLD = 1024;

const establishTimeFormat = (inputFormat?: TimeFormat): TimeFormat => {
  return inputFormat ?? TimeFormat.TWELVE_HOUR;
};

const assembleTimestampPattern = (format: TimeFormat): string => {
  return `ddd, MMM D, YYYY ${format}`;
};

const createPreviewPlaceholders = (
  timeFormat: TimeFormat,
  timestampPattern: string,
  actionType?: WorkflowActions
) => {
  const timeSlotPlaceholder = `{START_TIME_${timeFormat}}`;
  const dateSlotPlaceholder = `{EVENT_DATE_${timestampPattern}}`;
  const eventPlaceholder = "{EVENT_NAME}";
  const zoneHolderText = "{TIMEZONE}";

  const isAttendeeFlow = actionType === WorkflowActions.WHATSAPP_ATTENDEE;
  const guestPlaceholder = isAttendeeFlow ? "{ORGANIZER}" : "{ATTENDEE}";
  const hostPlaceholder = isAttendeeFlow ? "{ATTENDEE}" : "{ORGANIZER}";

  return {
    startTime: timeSlotPlaceholder,
    eventDate: dateSlotPlaceholder,
    eventName: eventPlaceholder,
    timeZone: zoneHolderText,
    attendee: guestPlaceholder,
    name: hostPlaceholder,
  };
};

const processLiveTimestamp = (
  timestampValue: string,
  timezoneValue: string,
  localeValue: string,
  formatValue: TimeFormat
) => {
  const timeInstance = dayjs(timestampValue).tz(timezoneValue).locale(localeValue);

  return {
    dateOutput: timeInstance.format("YYYY MMM D"),
    timeOutput: timeInstance.format(formatValue),
  };
};

const assembleThankYouMessage = (
  recipientName: string,
  sessionName: string,
  sessionDate: string,
  sessionTime: string,
  sessionTimezone: string
): string => {
  const addressee = recipientName || "user";

  return `Hi ${addressee}, thank you for attending the event (*${sessionName}*) on ${sessionDate} at ${sessionTime} ${sessionTimezone}.`;
};

const verifyMessageConstraints = (content: string): string | null => {
  return content.length <= CHARACTER_LIMIT_THRESHOLD ? content : null;
};

const generateTemplateContent = (parameters: CompletionMessageParams) => {
  const appliedTimeFormat = establishTimeFormat(parameters.timeDisplayFormat);
  const timestampStructure = assembleTimestampPattern(appliedTimeFormat);

  if (parameters.previewMode) {
    return createPreviewPlaceholders(appliedTimeFormat, timestampStructure, parameters.actionType);
  }

  const { dateOutput, timeOutput } = processLiveTimestamp(
    parameters.scheduledTimestamp!,
    parameters.locationTimezone!,
    parameters.regionLocale,
    appliedTimeFormat
  );

  return {
    startTime: timeOutput,
    eventDate: dateOutput,
    eventName: parameters.sessionTitle,
    timeZone: parameters.locationTimezone,
    attendee: parameters.guestIdentity,
    name: parameters.organizerIdentity,
  };
};

export const whatsappEventCompletedTemplate = (
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
  const messageParameters: CompletionMessageParams = {
    previewMode: isEditingMode,
    regionLocale: locale,
    actionType: action,
    timeDisplayFormat: timeFormat,
    scheduledTimestamp: startTime,
    sessionTitle: eventName,
    locationTimezone: timeZone,
    guestIdentity: attendee,
    organizerIdentity: name,
  };

  const templateData = generateTemplateContent(messageParameters);

  const finalMessage = assembleThankYouMessage(
    templateData.name || "user",
    templateData.eventName || "",
    templateData.eventDate || "",
    templateData.startTime || "",
    templateData.timeZone || ""
  );

  return verifyMessageConstraints(finalMessage);
};
