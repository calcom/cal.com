import type { TFunction } from "i18next";

import dayjs from "@calcom/dayjs";
import { APP_NAME } from "@calcom/lib/constants";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions } from "@calcom/prisma/enums";

const emailRatingTemplate = ({
  isEditingMode,
  locale,
  action,
  t,
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
  t: TFunction;
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

  const emailSubject = `${t("experience_review_prompt")} ${eventName}`;

  const introHtml = `<p>${t("hi")}${name ? ` ${name}` : ""},<br><br>${t(
    "improve_customer_experience_message"
  )} ${t("meeting_satisfaction_question")}<br></p>`;

  const ratingHtml = `<h6><a href="${ratingUrl}=1">😠 </a> <a href="${ratingUrl}=2">🙁 </a> <a href="${ratingUrl}=3">😐 </a> <a href="${ratingUrl}=4">😄 </a> <a href="${ratingUrl}=5">😍</a></h6>`;

  const noShowHtml = `${organizer} ${t("meeting_not_joined_question")}<a href="${noShowUrl}"> ${t(
    "reschedule_cta_short"
  )}</a><br><br>`;

  const eventHtml = `<strong>${t("event_upper_case")}: </strong>${eventName}<br><br>`;

  const dateTimeHtml = `<strong>${t(
    "date_and_time"
  )}: </strong>${eventDate} - ${endTime} (${timeZone})<br><br>`;

  const attendeeHtml = `<strong>${t("attendees")}: </strong>${t("you_and_conjunction")} ${organizer}<br><br>`;

  const branding =
    !isBrandingDisabled && !isEditingMode ? `<div>_<br><br>${t("scheduling_by")} ${APP_NAME}</div>` : "";

  const endingHtml = `${branding}`;

  const emailBody = `<body>${introHtml}${ratingHtml}<p>${noShowHtml}${eventHtml}${dateTimeHtml}${attendeeHtml}${endingHtml}</p></body>`;

  return { emailSubject, emailBody };
};

export default emailRatingTemplate;

export const plainTextTemplate =
  "Hi {ORGANIZER},We're always looking to improve our customer's experience. How satisfied were you with your recent meeting?😠  🙁  😐  😄  😍{ORGANIZER} didn't join the meeting? Reschedule here.Event: {EVENT_NAME}Date & Time: {EVENT_DATE_ddd, MMM D, YYYY h:mma} - {EVENT_END_TIME} ({TIMEZONE})Attendees: You & {ORGANIZER}";
