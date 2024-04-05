import dayjs from "@calcom/dayjs";
import { APP_NAME } from "@calcom/lib/constants";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions } from "@calcom/prisma/enums";

const emailRatingTemplate = ({
  isEditingMode,
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
  const currentTimeFormat = timeFormat || TimeFormat.TWELVE_HOUR;
  const dateTimeFormat = `ddd, MMM D, YYYY ${currentTimeFormat}`;

  let eventDate = "";

  if (isEditingMode) {
    endTime = "{EVENT_END_TIME}";
    eventName = "{EVENT_NAME}";
    timeZone = "{TIMEZONE}";
    organizer = "{ORGANIZER}";
    name = action === WorkflowActions.EMAIL_ATTENDEE ? "{ATTENDEE}" : "{ORGANIZER}";
    eventDate = `{EVENT_DATE_${dateTimeFormat}}`;
    ratingUrl = "{RATING_URL}";
    noShowUrl = "{NO_SHOW_URL}";
  } else {
    eventDate = dayjs(startTime).tz(timeZone).format(dateTimeFormat);

    endTime = dayjs(endTime).tz(timeZone).format(currentTimeFormat);
  }

  const emailSubject = `How was your recent experience?: ${eventName}`;

  const introHtml = `<body>Hi${
    name ? ` ${name}` : ""
  },<br><br>We're always looking to improve our customer's experience. How satisfied were you with your recent meeting?<br><br>`;

  const ratingHtml = `<a href="${ratingUrl}=1">😠</a> <a href="${ratingUrl}=2">🙁</a> <a href="${ratingUrl}=3">😐</a> <a href="${ratingUrl}=4">😄</a> <a href="${ratingUrl}=5">😍</a><br><br>`;

  const noShowHtml = `<div><a href="${noShowUrl}">${organizer} didn't join the meeting</a></div><br><br>`;

  const eventHtml = `<div><strong class="editor-text-bold">Event: </strong></div>${eventName}<br><br>`;

  const dateTimeHtml = `<div><strong class="editor-text-bold">Date & Time: </strong></div>${eventDate} - ${endTime} (${timeZone})<br><br>`;

  const attendeeHtml = `<div><strong class="editor-text-bold">Attendees: </strong></div>You & ${organizer}<br><br>`;

  const branding = !isBrandingDisabled && !isEditingMode ? `<br><br>_<br><br>Scheduling by ${APP_NAME}` : "";

  const endingHtml = `This survey was triggered by a Workflow in Cal.${branding}</body>`;

  const emailBody =
    introHtml + ratingHtml + noShowHtml + eventHtml + dateTimeHtml + attendeeHtml + endingHtml;

  return { emailSubject, emailBody };
};

export default emailRatingTemplate;
