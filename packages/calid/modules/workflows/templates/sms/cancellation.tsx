import dayjs from "@calcom/dayjs";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions } from "@calcom/prisma/enums";

interface CancellationNotificationConfig {
  previewMode: boolean;
  languageRegion: string;
  workflowDirection?: WorkflowActions;
  clockFormat?: TimeFormat;
  appointmentTime?: string;
  sessionTitle?: string;
  timezoneData?: string;
  participantIdentity?: string;
  userIdentity?: string;
  cancellationReason?: string;
}

const PREFERRED_MESSAGE_LIMIT = 320;
const MAXIMUM_MESSAGE_LIMIT = 1600;

const determineClockStyle = (providedFormat?: TimeFormat): TimeFormat => {
  return providedFormat ?? TimeFormat.TWELVE_HOUR;
};

const createEditingPlaceholders = (clockFormat: TimeFormat, workflowDirection?: WorkflowActions) => {
  const isAttendeeFlow = workflowDirection === WorkflowActions.SMS_ATTENDEE;

  return {
    sessionTitle: "{EVENT_NAME}",
    timezoneData: "{TIMEZONE}",
    appointmentTime: `{EVENT_TIME_${clockFormat}}`,
    appointmentDate: "{EVENT_DATE_YYYY MMM D}",
    participantIdentity: isAttendeeFlow ? "{ORGANIZER}" : "{ATTENDEE}",
    userIdentity: isAttendeeFlow ? "{ATTENDEE}" : "{ORGANIZER}",
    cancellationReason: "{CANCELLATION_REASON}",
  };
};

const calculateRealValues = (
  startTimestamp: string,
  timezone: string,
  locale: string,
  clockFormat: TimeFormat
) => {
  const momentInstance = dayjs(startTimestamp).tz(timezone).locale(locale);

  return {
    formattedDate: momentInstance.format("YYYY MMM D"),
    formattedTime: momentInstance.format(clockFormat),
  };
};

const constructDetailedCancellationMessage = (
  hostName: string,
  eventTitle: string,
  attendeeName: string,
  eventDate: string,
  eventTime: string,
  timezone: string,
  cancellationReason?: string
): string => {
  const greeting = hostName ? ` ${hostName}` : "";
  const reasonText = cancellationReason ? ` Reason: ${cancellationReason}` : "";
  return `Hi${greeting}, your meeting (${eventTitle}) with ${attendeeName} scheduled for ${eventDate} at ${eventTime} ${timezone} has been cancelled `;
};

const constructSimplifiedCancellationMessage = (
  attendeeName: string,
  eventDate: string,
  eventTime: string,
  timezone: string
): string => {
  return `Hi, your meeting with ${attendeeName} scheduled for ${eventDate} at ${eventTime} ${timezone} has been cancelled `;
};

const constructMinimalCancellationMessage = (
  attendeeName: string,
  eventDate: string,
  eventTime: string
): string => {
  return `Hi, your meeting with ${attendeeName} on ${eventDate} at ${eventTime} has been cancelled`;
};

const validateMessageLength = (messageContent: string): string | null => {
  if (messageContent.length <= PREFERRED_MESSAGE_LIMIT) {
    return messageContent;
  }
  return null;
};

const validateFallbackLength = (messageContent: string): string | null => {
  if (messageContent.length <= MAXIMUM_MESSAGE_LIMIT) {
    return messageContent;
  }
  return null;
};

const generateCancellationNotification = (config: CancellationNotificationConfig): string | null => {
  const selectedClockStyle = determineClockStyle(config.clockFormat);

  let contentData: {
    sessionTitle: string;
    timezoneData: string;
    appointmentTime: string;
    appointmentDate: string;
    participantIdentity: string;
    userIdentity: string;
    cancellationReason: string;
  };

  if (config.previewMode) {
    contentData = createEditingPlaceholders(selectedClockStyle, config.workflowDirection);
  } else {
    const { formattedDate, formattedTime } = calculateRealValues(
      config.appointmentTime!,
      config.timezoneData!,
      config.languageRegion,
      selectedClockStyle
    );

    contentData = {
      sessionTitle: config.sessionTitle || "",
      timezoneData: config.timezoneData || "",
      appointmentTime: formattedTime,
      appointmentDate: formattedDate,
      participantIdentity: config.participantIdentity || "",
      userIdentity: config.userIdentity || "",
      cancellationReason: config.cancellationReason || "",
    };
  }

  // Try detailed message with reason
  const detailedMessage = constructDetailedCancellationMessage(
    contentData.userIdentity,
    contentData.sessionTitle,
    contentData.participantIdentity,
    contentData.appointmentDate,
    contentData.appointmentTime,
    contentData.timezoneData,
    contentData.cancellationReason
  );

  const validatedDetailed = validateMessageLength(detailedMessage);
  if (validatedDetailed) return validatedDetailed;

  // Try simplified message with timezone
  const simplifiedMessage = constructSimplifiedCancellationMessage(
    contentData.participantIdentity,
    contentData.appointmentDate,
    contentData.appointmentTime,
    contentData.timezoneData
  );

  const validatedSimplified = validateMessageLength(simplifiedMessage);
  if (validatedSimplified) return validatedSimplified;

  // Try minimal message without timezone
  const minimalMessage = constructMinimalCancellationMessage(
    contentData.participantIdentity,
    contentData.appointmentDate,
    contentData.appointmentTime
  );

  return validateFallbackLength(minimalMessage);
};

const smsCancellationTemplate = (
  isEditingMode: boolean,
  locale: string,
  action?: WorkflowActions,
  timeFormat?: TimeFormat,
  startTime?: string,
  eventName?: string,
  timeZone?: string,
  attendee?: string,
  name?: string,
  cancellationReason?: string
) => {
  const notificationConfig: CancellationNotificationConfig = {
    previewMode: isEditingMode,
    languageRegion: locale,
    workflowDirection: action,
    clockFormat: timeFormat,
    appointmentTime: startTime,
    sessionTitle: eventName,
    timezoneData: timeZone,
    participantIdentity: attendee,
    userIdentity: name,
    cancellationReason: cancellationReason,
  };

  return generateCancellationNotification(notificationConfig);
};

export default smsCancellationTemplate;
