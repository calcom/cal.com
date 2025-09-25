import { guessEventLocationType } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import { APP_NAME } from "@calcom/lib/constants";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions } from "@calcom/prisma/enums";

interface ReminderNotificationConfig {
  previewMode: boolean;
  cultureLocale: string;
  operationTarget?: WorkflowActions;
  timeDisplayStyle?: TimeFormat;
  appointmentStart?: string;
  appointmentEnd?: string;
  sessionName?: string;
  timezoneRegion?: string;
  venueDetails?: string;
  virtualMeetingLink?: string;
  counterpartyName?: string;
  userDisplayName?: string;
  brandingHidden?: boolean;
}

interface NotificationOutput {
  emailSubject: string;
  emailBody: string;
}

const establishClockFormat = (providedFormat?: TimeFormat): TimeFormat => {
  return providedFormat ?? TimeFormat.TWELVE_HOUR;
};

const createTimestampTemplate = (clockFormat: TimeFormat): string => {
  return `ddd, MMM D, YYYY ${clockFormat}`;
};

const resolveLocationDisplay = (
  venueInfo?: string,
  meetingLink?: string,
  isPreviewMode?: boolean
): string => {
  if (isPreviewMode) {
    return "{LOCATION} {MEETING_URL}";
  }

  const processedLocation = guessEventLocationType(venueInfo)?.label || venueInfo || "";
  return `${processedLocation} ${meetingLink || ""}`.trim();
};

const generatePreviewPlaceholders = (timestampTemplate: string, operationTarget?: WorkflowActions) => {
  const isAttendeeTarget = operationTarget === WorkflowActions.EMAIL_ATTENDEE;

  return {
    appointmentEnd: "{EVENT_END_TIME}",
    sessionName: "{EVENT_NAME}",
    timezoneRegion: "{TIMEZONE}",
    counterpartyName: isAttendeeTarget ? "{ORGANIZER}" : "{ATTENDEE}",
    userDisplayName: isAttendeeTarget ? "{ATTENDEE}" : "{ORGANIZER}",
    appointmentDate: `{EVENT_DATE_${timestampTemplate}}`,
  };
};

const computeActualTimestamps = (
  startTime: string,
  endTime: string,
  timezone: string,
  locale: string,
  clockFormat: TimeFormat,
  timestampTemplate: string
) => {
  const startMoment = dayjs(startTime).tz(timezone).locale(locale);
  const endMoment = dayjs(endTime).tz(timezone).locale(locale);

  return {
    formattedEventDate: startMoment.format(timestampTemplate),
    formattedEndTime: endMoment.format(clockFormat),
  };
};

const buildSubjectMessage = (eventTitle: string, eventDate: string): string => {
  return `Reminder: ${eventTitle} - ${eventDate}`;
};

const createWelcomeSection = (userName?: string): string => {
  const personalizedGreeting = userName ? ` ${userName}` : "";
  return `<body>Hi${personalizedGreeting},<br><br>This is a reminder about your upcoming event.<br><br>`;
};

const generateEventDetailsBlock = (eventTitle: string): string => {
  return `<div><strong class="editor-text-bold">Event: </strong></div>${eventTitle}<br><br>`;
};

const generateScheduleBlock = (eventDate: string, endTime: string, timezone: string): string => {
  return `<div><strong class="editor-text-bold">Date & Time: </strong></div>${eventDate} - ${endTime} (${timezone})<br><br>`;
};

const generateParticipantsBlock = (otherParticipant: string): string => {
  return `<div><strong class="editor-text-bold">Attendees: </strong></div>You & ${otherParticipant}<br><br>`;
};

const generateVenueBlock = (locationInfo: string): string => {
  return `<div><strong class="editor-text-bold">Location: </strong></div>${locationInfo}<br><br>`;
};

const createFooterSection = (brandingHidden?: boolean, previewMode?: boolean): string => {
  const brandingText = !brandingHidden && !previewMode ? `<br><br>_<br><br>Scheduling by ${APP_NAME}` : "";

  return `This reminder was triggered by a Workflow in Cal ID.${brandingText}</body>`;
};

const assembleNotificationContent = (
  welcomeHtml: string,
  eventDetailsHtml: string,
  scheduleHtml: string,
  participantsHtml: string,
  venueHtml: string,
  footerHtml: string
): string => {
  return welcomeHtml + eventDetailsHtml + scheduleHtml + participantsHtml + venueHtml + footerHtml;
};

const processReminderConfiguration = (config: ReminderNotificationConfig): NotificationOutput => {
  const clockDisplayFormat = establishClockFormat(config.timeDisplayStyle);
  const dateTimeTemplate = createTimestampTemplate(clockDisplayFormat);

  const locationDisplay = resolveLocationDisplay(
    config.venueDetails,
    config.virtualMeetingLink,
    config.previewMode
  );

  let contentData: {
    appointmentEnd: string;
    sessionName: string;
    timezoneRegion: string;
    counterpartyName: string;
    userDisplayName: string;
    appointmentDate: string;
  };

  if (config.previewMode) {
    contentData = generatePreviewPlaceholders(dateTimeTemplate, config.operationTarget);
  } else {
    const { formattedEventDate, formattedEndTime } = computeActualTimestamps(
      config.appointmentStart!,
      config.appointmentEnd!,
      config.timezoneRegion!,
      config.cultureLocale,
      clockDisplayFormat,
      dateTimeTemplate
    );

    contentData = {
      appointmentEnd: formattedEndTime,
      sessionName: config.sessionName || "",
      timezoneRegion: config.timezoneRegion || "",
      counterpartyName: config.counterpartyName || "",
      userDisplayName: config.userDisplayName || "",
      appointmentDate: formattedEventDate,
    };
  }

  const subjectLine = buildSubjectMessage(contentData.sessionName, contentData.appointmentDate);

  const welcomeSection = createWelcomeSection(contentData.userDisplayName);
  const eventDetailsSection = generateEventDetailsBlock(contentData.sessionName);
  const scheduleSection = generateScheduleBlock(
    contentData.appointmentDate,
    contentData.appointmentEnd,
    contentData.timezoneRegion
  );
  const participantsSection = generateParticipantsBlock(contentData.counterpartyName);
  const venueSection = generateVenueBlock(locationDisplay);
  const footerSection = createFooterSection(config.brandingHidden, config.previewMode);

  const bodyContent = assembleNotificationContent(
    welcomeSection,
    eventDetailsSection,
    scheduleSection,
    participantsSection,
    venueSection,
    footerSection
  );

  return {
    emailSubject: subjectLine,
    emailBody: bodyContent,
  };
};

const emailReminderTemplate = ({
  isEditingMode,
  locale,
  action,
  timeFormat,
  startTime,
  endTime,
  eventName,
  timeZone,
  location,
  meetingUrl,
  otherPerson,
  name,
  isBrandingDisabled,
}: {
  isEditingMode: boolean;
  locale: string;
  action?: WorkflowActions;
  timeFormat?: TimeFormat;
  startTime?: string;
  endTime?: string;
  eventName?: string;
  timeZone?: string;
  location?: string;
  meetingUrl?: string;
  otherPerson?: string;
  name?: string;
  isBrandingDisabled?: boolean;
}) => {
  const reminderConfig: ReminderNotificationConfig = {
    previewMode: isEditingMode,
    cultureLocale: locale,
    operationTarget: action,
    timeDisplayStyle: timeFormat,
    appointmentStart: startTime,
    appointmentEnd: endTime,
    sessionName: eventName,
    timezoneRegion: timeZone,
    venueDetails: location,
    virtualMeetingLink: meetingUrl,
    counterpartyName: otherPerson,
    userDisplayName: name,
    brandingHidden: isBrandingDisabled,
  };

  return processReminderConfiguration(reminderConfig);
};

export default emailReminderTemplate;
