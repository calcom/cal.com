import dayjs from "@calcom/dayjs";
import { APP_NAME } from "@calcom/lib/constants";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions } from "@calcom/prisma/enums";

interface FeedbackEmailConfiguration {
  designMode: boolean;
  regionLocale: string;
  workflowTarget: WorkflowActions;
  clockFormat?: TimeFormat;
  sessionStart?: string;
  sessionEnd?: string;
  meetingTitle?: string;
  zoneInfo?: string;
  hostName?: string;
  recipientName?: string;
  brandingSuppressed?: boolean;
  feedbackLink?: string;
  rescheduleLink?: string;
}

interface EmailOutputData {
  emailSubject: string;
  emailBody: string;
}

const determineTimeDisplayStyle = (providedFormat?: TimeFormat): TimeFormat => {
  return providedFormat ?? TimeFormat.TWELVE_HOUR;
};

const constructDateTimePattern = (clockFormat: TimeFormat): string => {
  return `ddd, MMM D, YYYY ${clockFormat}`;
};

const generatePlaceholderContent = (datePattern: string, workflowTarget: WorkflowActions) => {
  const recipientPlaceholder =
    workflowTarget === WorkflowActions.EMAIL_ATTENDEE ? "{ATTENDEE}" : "{ORGANIZER}";

  return {
    sessionEnd: "{EVENT_END_TIME}",
    meetingTitle: "{EVENT_NAME}",
    zoneInfo: "{TIMEZONE}",
    hostName: "{ORGANIZER}",
    recipientName: recipientPlaceholder,
    sessionDate: `{EVENT_DATE_${datePattern}}`,
    feedbackLink: "{RATING_URL}",
    rescheduleLink: "{NO_SHOW_URL}",
  };
};

const calculateRealTimestamps = (
  startTimestamp: string,
  endTimestamp: string,
  timezone: string,
  locale: string,
  clockFormat: TimeFormat,
  datePattern: string
) => {
  const startMoment = dayjs(startTimestamp).tz(timezone).locale(locale);
  const endMoment = dayjs(endTimestamp).tz(timezone).locale(locale);

  return {
    formattedDate: startMoment.format(datePattern),
    formattedEndTime: endMoment.format(clockFormat),
  };
};

const buildSubjectLine = (eventTitle: string): string => {
  return `How was your recent experience? ${eventTitle}`;
};

const createGreetingSection = (recipientName?: string): string => {
  const greeting = recipientName ? ` ${recipientName}` : "";
  return `<p>Hi${greeting},<br><br>We're always looking to improve our customer's experience. How satisfied were you with your recent meeting?<br></p>`;
};

const constructRatingInterface = (ratingUrl: string): string => {
  return `<h6><a href="${ratingUrl}=1">😠 </a> <a href="${ratingUrl}=2">🙁 </a> <a href="${ratingUrl}=3">😐 </a> <a href="${ratingUrl}=4">😄 </a> <a href="${ratingUrl}=5">😍</a></h6>`;
};

const generateNoShowSection = (hostName: string, noShowUrl: string): string => {
  return `${hostName} didn't join the meeting?<a href="${noShowUrl}"> Reschedule here</a><br><br>`;
};

const buildEventDetailsHtml = (
  meetingTitle: string,
  eventDate: string,
  endTime: string,
  timezone: string,
  hostName: string
): string => {
  const eventInfo = `<strong>Event: </strong>${meetingTitle}<br><br>`;
  const scheduleInfo = `<strong>Date & Time: </strong>${eventDate} - ${endTime} (${timezone})<br><br>`;
  const participantInfo = `<strong>Attendees: </strong>You & ${hostName}<br><br>`;

  return eventInfo + scheduleInfo + participantInfo;
};

const generateFooterContent = (brandingSuppressed?: boolean, designMode?: boolean): string => {
  const brandingText =
    !brandingSuppressed && !designMode ? `<div>_<br><br>Scheduling by ${APP_NAME}</div>` : "";

  return `This survey was triggered by a Workflow in Cal ID.${brandingText}`;
};

const assembleEmailBody = (
  greetingHtml: string,
  ratingHtml: string,
  noShowHtml: string,
  detailsHtml: string,
  footerHtml: string
): string => {
  return `<body>${greetingHtml}${ratingHtml}<p>${noShowHtml}${detailsHtml}${footerHtml}</p></body>`;
};

const processEmailContent = (config: FeedbackEmailConfiguration): EmailOutputData => {
  const clockDisplayFormat = determineTimeDisplayStyle(config.clockFormat);
  const timestampPattern = constructDateTimePattern(clockDisplayFormat);

  let contentData: {
    sessionEnd: string;
    meetingTitle: string;
    zoneInfo: string;
    hostName: string;
    recipientName: string;
    sessionDate: string;
    feedbackLink: string;
    rescheduleLink: string;
  };

  if (config.designMode) {
    contentData = generatePlaceholderContent(timestampPattern, config.workflowTarget);
  } else {
    const { formattedDate, formattedEndTime } = calculateRealTimestamps(
      config.sessionStart!,
      config.sessionEnd!,
      config.zoneInfo!,
      config.regionLocale,
      clockDisplayFormat,
      timestampPattern
    );

    contentData = {
      sessionEnd: formattedEndTime,
      meetingTitle: config.meetingTitle || "",
      zoneInfo: config.zoneInfo || "",
      hostName: config.hostName || "",
      recipientName: config.recipientName || "",
      sessionDate: formattedDate,
      feedbackLink: config.feedbackLink || "",
      rescheduleLink: config.rescheduleLink || "",
    };
  }

  const subjectLine = buildSubjectLine(contentData.meetingTitle);

  const greetingSection = createGreetingSection(contentData.recipientName);
  const ratingInterface = constructRatingInterface(contentData.feedbackLink);
  const noShowSection = generateNoShowSection(contentData.hostName, contentData.rescheduleLink);
  const eventDetails = buildEventDetailsHtml(
    contentData.meetingTitle,
    contentData.sessionDate,
    contentData.sessionEnd,
    contentData.zoneInfo,
    contentData.hostName
  );
  const footerContent = generateFooterContent(config.brandingSuppressed, config.designMode);

  const bodyContent = assembleEmailBody(
    greetingSection,
    ratingInterface,
    noShowSection,
    eventDetails,
    footerContent
  );

  return {
    emailSubject: subjectLine,
    emailBody: bodyContent,
  };
};

const emailRatingTemplate = ({
  isEditingMode,
  locale,
  action,
  timeFormat,
  startTime,
  endTime,
  eventName,
  timeZone,
  organizer,
  name,
  isBrandingDisabled,
  ratingUrl,
  noShowUrl,
}: {
  isEditingMode: boolean;
  locale: string;
  action: WorkflowActions;
  timeFormat?: TimeFormat;
  startTime?: string;
  endTime?: string;
  eventName?: string;
  timeZone?: string;
  organizer?: string;
  name?: string;
  isBrandingDisabled?: boolean;
  ratingUrl?: string;
  noShowUrl?: string;
}) => {
  const emailConfig: FeedbackEmailConfiguration = {
    designMode: isEditingMode,
    regionLocale: locale,
    workflowTarget: action,
    clockFormat: timeFormat,
    sessionStart: startTime,
    sessionEnd: endTime,
    meetingTitle: eventName,
    zoneInfo: timeZone,
    hostName: organizer,
    recipientName: name,
    brandingSuppressed: isBrandingDisabled,
    feedbackLink: ratingUrl,
    rescheduleLink: noShowUrl,
  };

  return processEmailContent(emailConfig);
};

export default emailRatingTemplate;
