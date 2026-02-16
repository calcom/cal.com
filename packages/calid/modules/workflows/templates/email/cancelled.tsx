import { guessEventLocationType } from "@calcom/app-store/locations";
import { APP_NAME } from "@calcom/lib/constants";
import { WorkflowActions } from "@calcom/prisma/enums";

interface CancelledNotificationConfig {
  previewMode: boolean;
  cultureLocale: string;
  operationTarget?: WorkflowActions;
  appointmentStart?: string;
  appointmentEnd?: string;
  sessionName?: string;
  timezoneRegion?: string;
  venueDetails?: string;
  counterpartyName?: string;
  userDisplayName?: string;
  brandingHidden?: boolean;
  cancellationReason?: string;
}

interface NotificationOutput {
  emailSubject: string;
  emailBody: string;
}

const resolveLocationDisplay = (venueInfo?: string, isPreviewMode?: boolean): string => {
  if (isPreviewMode) {
    return "{LOCATION}";
  }

  const processedLocation = guessEventLocationType(venueInfo)?.label || venueInfo || "";
  return `${processedLocation} `.trim();
};

const generatePreviewPlaceholders = (operationTarget?: WorkflowActions) => {
  const isAttendeeTarget = operationTarget === WorkflowActions.EMAIL_ATTENDEE;

  return {
    eventName: "{EVENT_NAME}",
    eventDate: "{EVENT_DATE}",
    eventTime: "{EVENT_TIME}",
    eventEndTime: "{EVENT_END_TIME}",
    timezone: "{TIMEZONE}",
    location: "{LOCATION}",
    organizerName: "{ORGANIZER_NAME}",
    attendeeName: "{ATTENDEE_NAME}",
    counterpartyName: isAttendeeTarget ? "{ORGANIZER_NAME}" : "{ATTENDEE_NAME}",
    userDisplayName: isAttendeeTarget ? "{ATTENDEE_NAME}" : "{ORGANIZER_NAME}",
    cancellationReason: "{CANCELLATION_REASON}",
  };
};

const buildSubjectMessage = (eventTitle: string, eventDate: string): string => {
  return `Cancelled: ${eventTitle} - ${eventDate}`;
};

const createWelcomeSection = (userName?: string): string => {
  const personalizedGreeting = userName ? ` ${userName}` : "";
  return `<body>Hi${personalizedGreeting},<br><br>The following event has been cancelled.<br><br>`;
};

const generateEventDetailsBlock = (eventTitle: string): string => {
  return `<div><strong class="editor-text-bold">Event: </strong></div>${eventTitle}<br><br>`;
};

const generateScheduleBlock = (
  eventDate: string,
  eventTime: string,
  eventEndTime: string,
  timezone: string
): string => {
  return `<div><strong class="editor-text-bold">Originally Scheduled: </strong></div>${eventDate} ${eventTime} - ${eventEndTime} (${timezone})<br><br>`;
};

const generateParticipantsBlock = (otherParticipant: string): string => {
  return `<div><strong class="editor-text-bold">Attendees: </strong></div>You & ${otherParticipant}<br><br>`;
};

const generateVenueBlock = (locationInfo: string): string => {
  return `<div><strong class="editor-text-bold">Location: </strong></div>${locationInfo}<br><br>`;
};

const generateCancellationReasonBlock = (reason?: string): string => {
  return `<div><strong class="editor-text-bold">Cancellation Reason: </strong></div>${reason}<br><br>`;
};

const createFooterSection = (brandingHidden?: boolean, previewMode?: boolean): string => {
  const brandingText = !brandingHidden && !previewMode ? `<br><br>_<br><br>Scheduling by ${APP_NAME}` : "";

  return `This cancellation notification was triggered by a Workflow in Cal ID.${brandingText}</body>`;
};

const assembleNotificationContent = (
  welcomeHtml: string,
  eventDetailsHtml: string,
  scheduleHtml: string,
  participantsHtml: string,
  venueHtml: string,
  cancellationReasonHtml: string,
  footerHtml: string
): string => {
  return (
    welcomeHtml +
    eventDetailsHtml +
    scheduleHtml +
    participantsHtml +
    venueHtml +
    cancellationReasonHtml +
    footerHtml
  );
};

const processCancelledConfiguration = (config: CancelledNotificationConfig): NotificationOutput => {
  const locationDisplay = resolveLocationDisplay(config.venueDetails, config.previewMode);

  let contentData: {
    eventName: string;
    eventDate: string;
    eventTime: string;
    eventEndTime: string;
    timezone: string;
    location: string;
    organizerName: string;
    attendeeName: string;
    counterpartyName: string;
    userDisplayName: string;
    cancellationReason: string;
  };

  if (config.previewMode) {
    const previewData = generatePreviewPlaceholders(config.operationTarget);
    contentData = {
      ...previewData,
      location: locationDisplay,
    };
  } else {
    contentData = {
      eventName: config.sessionName || "",
      eventDate: config.appointmentStart || "",
      eventTime: config.appointmentStart || "",
      eventEndTime: config.appointmentEnd || "",
      timezone: config.timezoneRegion || "",
      location: locationDisplay,
      organizerName:
        config.operationTarget === WorkflowActions.EMAIL_ATTENDEE
          ? config.counterpartyName || ""
          : config.userDisplayName || "",
      attendeeName:
        config.operationTarget === WorkflowActions.EMAIL_ATTENDEE
          ? config.userDisplayName || ""
          : config.counterpartyName || "",
      counterpartyName: config.counterpartyName || "",
      userDisplayName: config.userDisplayName || "",
      cancellationReason: config.cancellationReason || "",
    };
  }

  const subjectLine = buildSubjectMessage(contentData.eventName, contentData.eventDate);

  const welcomeSection = createWelcomeSection(contentData.userDisplayName);
  const eventDetailsSection = generateEventDetailsBlock(contentData.eventName);
  const scheduleSection = generateScheduleBlock(
    contentData.eventDate,
    contentData.eventTime,
    contentData.eventEndTime,
    contentData.timezone
  );
  const participantsSection = generateParticipantsBlock(contentData.counterpartyName);
  const venueSection = generateVenueBlock(contentData.location);
  const cancellationReasonSection = generateCancellationReasonBlock(contentData.cancellationReason);
  const footerSection = createFooterSection(config.brandingHidden, config.previewMode);

  const bodyContent = assembleNotificationContent(
    welcomeSection,
    eventDetailsSection,
    scheduleSection,
    participantsSection,
    venueSection,
    cancellationReasonSection,
    footerSection
  );

  return {
    emailSubject: subjectLine,
    emailBody: bodyContent,
  };
};

const emailCancelledTemplate = ({
  isEditingMode,
  locale,
  action,
  startTime,
  endTime,
  eventName,
  timeZone,
  location,
  otherPerson,
  name,
  cancellationReason,
  isBrandingDisabled,
}: {
  isEditingMode: boolean;
  locale: string;
  action?: WorkflowActions;
  startTime?: string;
  endTime?: string;
  eventName?: string;
  timeZone?: string;
  location?: string;
  otherPerson?: string;
  name?: string;
  cancellationReason?: string;
  isBrandingDisabled?: boolean;
}) => {
  const cancelledConfig: CancelledNotificationConfig = {
    previewMode: isEditingMode,
    cultureLocale: locale,
    operationTarget: action,
    appointmentStart: startTime,
    appointmentEnd: endTime,
    sessionName: eventName,
    timezoneRegion: timeZone,
    venueDetails: location,
    counterpartyName: otherPerson,
    userDisplayName: name,
    brandingHidden: isBrandingDisabled,
    cancellationReason: cancellationReason,
  };

  return processCancelledConfiguration(cancelledConfig);
};

export default emailCancelledTemplate;
