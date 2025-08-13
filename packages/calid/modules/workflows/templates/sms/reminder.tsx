import dayjs from "@calcom/dayjs";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions } from "@calcom/prisma/enums";

interface MobileNotificationConfig {
  previewMode: boolean;
  languageRegion: string;
  workflowDirection?: WorkflowActions;
  clockFormat?: TimeFormat;
  appointmentTime?: string;
  sessionTitle?: string;
  timezoneData?: string;
  participantIdentity?: string;
  userIdentity?: string;
}

const PREFERRED_MESSAGE_LIMIT = 320;
const MAXIMUM_MESSAGE_LIMIT = 1600;

const determineClockStyle = (providedFormat?: TimeFormat): TimeFormat => {
  return providedFormat ?? TimeFormat.TWELVE_HOUR;
};

const createEditingPlaceholders = (clockFormat: TimeFormat, workflowDirection?: WorkflowActions) => {
  const isParticipantFlow = workflowDirection === WorkflowActions.SMS_ATTENDEE;

  return {
    sessionTitle: "{EVENT_NAME}",
    timezoneData: "{TIMEZONE}",
    appointmentTime: `{EVENT_TIME_${clockFormat}}`,
    appointmentDate: "{EVENT_DATE_YYYY MMM D}",
    participantIdentity: isParticipantFlow ? "{ORGANIZER}" : "{ATTENDEE}",
    userIdentity: isParticipantFlow ? "{ATTENDEE}" : "{ORGANIZER}",
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

const constructDetailedMessage = (
  userName: string,
  eventTitle: string,
  otherParty: string,
  eventDate: string,
  eventTime: string,
  timezone: string
): string => {
  const greeting = userName ? ` ${userName}` : "";
  return `Hi${greeting}, this is a reminder that your meeting (${eventTitle}) with ${otherParty} is on ${eventDate} at ${eventTime} ${timezone}.`;
};

const constructSimplifiedMessage = (
  otherParty: string,
  eventDate: string,
  eventTime: string,
  timezone: string
): string => {
  return `Hi, this is a reminder that your meeting with ${otherParty} is on ${eventDate} at ${eventTime} ${timezone}`;
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

const generateMobileReminder = (config: MobileNotificationConfig): string | null => {
  const selectedClockStyle = determineClockStyle(config.clockFormat);

  let contentData: {
    sessionTitle: string;
    timezoneData: string;
    appointmentTime: string;
    appointmentDate: string;
    participantIdentity: string;
    userIdentity: string;
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
    };
  }

  const primaryMessage = constructDetailedMessage(
    contentData.userIdentity,
    contentData.sessionTitle,
    contentData.participantIdentity,
    contentData.appointmentDate,
    contentData.appointmentTime,
    contentData.timezoneData
  );

  const validatedPrimary = validateMessageLength(primaryMessage);
  if (validatedPrimary) return validatedPrimary;

  const fallbackMessage = constructSimplifiedMessage(
    contentData.participantIdentity,
    contentData.appointmentDate,
    contentData.appointmentTime,
    contentData.timezoneData
  );

  return validateFallbackLength(fallbackMessage);
};

const smsReminderTemplate = (
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
  const notificationConfig: MobileNotificationConfig = {
    previewMode: isEditingMode,
    languageRegion: locale,
    workflowDirection: action,
    clockFormat: timeFormat,
    appointmentTime: startTime,
    sessionTitle: eventName,
    timezoneData: timeZone,
    participantIdentity: attendee,
    userIdentity: name,
  };

  return generateMobileReminder(notificationConfig);
};

export default smsReminderTemplate;
