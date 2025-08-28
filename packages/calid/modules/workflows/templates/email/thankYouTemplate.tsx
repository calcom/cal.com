import dayjs from "@calcom/dayjs";
import { APP_NAME } from "@calcom/lib/constants";
import { TimeFormat } from "@calcom/lib/timeFormat";

interface GratitudeEmailConfiguration {
  designMode: boolean;
  clockStyle?: TimeFormat;
  sessionBeginning?: string;
  sessionConclusion?: string;
  meetingTitle?: string;
  regionTimezone?: string;
  participantName?: string;
  recipientIdentity?: string;
}

interface MessageOutput {
  emailSubject: string;
  emailBody: string;
}

const resolveTimeFormat = (providedFormat?: TimeFormat): TimeFormat => {
  return providedFormat ?? TimeFormat.TWELVE_HOUR;
};

const buildTimestampStructure = (clockStyle: TimeFormat): string => {
  return `ddd, MMM D, YYYY ${clockStyle}`;
};

const createPlaceholderValues = () => {
  return {
    sessionDate: "{EVENT_DATE}",
    sessionConclusion: "{EVENT_END_TIME}",
    meetingTitle: "{EVENT_NAME}",
    regionTimezone: "{TIMEZONE}",
    participantName: "{ORGANIZER}",
    recipientIdentity: "{ATTENDEE_FIRST_NAME}",
  };
};

const calculateFormattedTimestamps = (
  startTimestamp: string,
  endTimestamp: string,
  timezone: string,
  clockStyle: TimeFormat,
  timestampStructure: string
) => {
  const startMoment = dayjs(startTimestamp).tz(timezone);
  const endMoment = dayjs(endTimestamp).tz(timezone);

  return {
    formattedSessionDate: startMoment.format(timestampStructure),
    formattedEndTime: endMoment.format(clockStyle),
  };
};

const generateSubjectHeader = (eventTitle: string, recipientName?: string): string => {
  return `Thank You ${recipientName} for Attending: ${eventTitle}`;
};

const constructOpeningMessage = (recipientName?: string): string => {
  const personalizedAddress = recipientName ? ` ${recipientName}` : "";
  return `<body>Hi${personalizedAddress},<br><br>We want to extend our gratitude for your attendance at the recent event.<br><br>`;
};

const buildEventInformationBlock = (eventTitle: string): string => {
  return `<div><strong class="editor-text-bold">Event: </strong></div>${eventTitle}<br><br>`;
};

const constructTimingBlock = (eventDate: string, endTime: string, timezone: string): string => {
  return `<div><strong class="editor-text-bold">Date & Time: </strong></div>${eventDate} - ${endTime} (${timezone})<br><br>`;
};

const generateParticipantBlock = (otherAttendee: string): string => {
  return `<div><strong class="editor-text-bold">Attendees: </strong></div>You & ${otherAttendee}<br><br>`;
};

const createClosingStatement = (): string => {
  return `We look forward to seeing you at future events.<br><br>Best regards,<br>The ${APP_NAME} Team`;
};

const finalizeEmailStructure = (): string => {
  return `</body>`;
};

const assembleCompleteMessage = (
  openingHtml: string,
  eventInfoHtml: string,
  timingHtml: string,
  participantHtml: string,
  closingHtml: string,
  finalHtml: string
): string => {
  return openingHtml + eventInfoHtml + timingHtml + participantHtml + closingHtml + finalHtml;
};

const processGratitudeEmail = (config: GratitudeEmailConfiguration): MessageOutput => {
  const selectedClockStyle = resolveTimeFormat(config.clockStyle);
  const dateTimeStructure = buildTimestampStructure(selectedClockStyle);

  let contentData: {
    sessionDate: string;
    sessionConclusion: string;
    meetingTitle: string;
    regionTimezone: string;
    participantName: string;
    recipientIdentity: string;
  };

  if (config.designMode) {
    contentData = createPlaceholderValues();
  } else {
    const { formattedSessionDate, formattedEndTime } = calculateFormattedTimestamps(
      config.sessionBeginning!,
      config.sessionConclusion!,
      config.regionTimezone!,
      selectedClockStyle,
      dateTimeStructure
    );

    contentData = {
      sessionDate: formattedSessionDate,
      sessionConclusion: formattedEndTime,
      meetingTitle: config.meetingTitle || "",
      regionTimezone: config.regionTimezone || "",
      participantName: config.participantName || "",
      recipientIdentity: config.recipientIdentity || "",
    };
  }

  const subjectLine = generateSubjectHeader(contentData.meetingTitle, contentData.recipientIdentity);

  const openingSection = constructOpeningMessage(contentData.recipientIdentity);
  const eventInfoSection = buildEventInformationBlock(contentData.meetingTitle);
  const timingSection = constructTimingBlock(
    contentData.sessionDate,
    contentData.sessionConclusion,
    contentData.regionTimezone
  );
  const participantSection = generateParticipantBlock(contentData.participantName);
  const closingSection = createClosingStatement();
  const finalSection = finalizeEmailStructure();

  const bodyContent = assembleCompleteMessage(
    openingSection,
    eventInfoSection,
    timingSection,
    participantSection,
    closingSection,
    finalSection
  );

  return {
    emailSubject: subjectLine,
    emailBody: bodyContent,
  };
};

const emailThankYouTemplate = ({
  isEditingMode,
  timeFormat,
  startTime,
  endTime,
  eventName,
  timeZone,
  otherPerson,
  name,
}: {
  isEditingMode: boolean;
  timeFormat?: TimeFormat;
  startTime?: string;
  endTime?: string;
  eventName?: string;
  timeZone?: string;
  otherPerson?: string;
  name?: string;
}) => {
  const gratitudeConfig: GratitudeEmailConfiguration = {
    designMode: isEditingMode,
    clockStyle: timeFormat,
    sessionBeginning: startTime,
    sessionConclusion: endTime,
    meetingTitle: eventName,
    regionTimezone: timeZone,
    participantName: otherPerson,
    recipientIdentity: name,
  };

  return processGratitudeEmail(gratitudeConfig);
};

export default emailThankYouTemplate;
