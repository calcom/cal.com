import dayjs from "@calcom/dayjs";
import { APP_NAME } from "@calcom/lib/constants";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions } from "@calcom/prisma/enums";

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
    eventDate = dayjs(startTime).tz(timeZone).locale(locale).format(dateTimeFormat);

    endTime = dayjs(endTime).tz(timeZone).locale(locale).format(currentTimeFormat);
  }

  const emailSubject = `How was your recent experience? ${eventName}`;

  const introHtml = `<p>Hi${
    name ? ` ${name}` : ""
  },<br><br>We're always looking to improve our customer's experience. How satisfied were you with your recent meeting?<br></p>`;

  const ratingHtml = `<h6><a href="${ratingUrl}=1">😠 </a> <a href="${ratingUrl}=2">🙁 </a> <a href="${ratingUrl}=3">😐 </a> <a href="${ratingUrl}=4">😄 </a> <a href="${ratingUrl}=5">😍</a></h6>`;

  const noShowHtml = `${organizer} didn't join the meeting?<a href="${noShowUrl}"> Reschedule here</a><br><br>`;

  const eventHtml = `<strong>Event: </strong>${eventName}<br><br>`;

  const dateTimeHtml = `<strong>Date & Time: </strong>${eventDate} - ${endTime} (${timeZone})<br><br>`;

  const attendeeHtml = `<strong>Attendees: </strong>You & ${organizer}<br><br>`;

  const branding =
    !isBrandingDisabled && !isEditingMode ? `<div>_<br><br>Scheduling by ${APP_NAME}</div>` : "";

  const endingHtml = `This survey was triggered by a Workflow in Cal.${branding}`;

  const emailBody = `<body>${introHtml}${ratingHtml}<p>${noShowHtml}${eventHtml}${dateTimeHtml}${attendeeHtml}${endingHtml}</p></body>`;

  return { emailSubject, emailBody };
};

export default emailRatingTemplate;

export const plainTextTemplate =
  "Hi {ORGANIZER},We're always looking to improve our customer's experience. How satisfied were you with your recent meeting?😠  🙁  😐  😄  😍{ORGANIZER} didn't join the meeting? Reschedule hereEvent: {EVENT_NAME}Date & Time: {EVENT_DATE_ddd, MMM D, YYYY h:mma} - {EVENT_END_TIME} ({TIMEZONE})Attendees: You & {ORGANIZER}This survey was triggered by a Workflow in Cal.";
