import type { TFunction } from "i18next";

import { guessEventLocationType } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import { APP_NAME } from "@calcom/lib/constants";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions } from "@calcom/prisma/enums";

const emailReminderTemplate = ({
  isEditingMode,
  locale,
  t,
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
  t: TFunction;
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
  const currentTimeFormat = timeFormat || TimeFormat.TWELVE_HOUR;
  const dateTimeFormat = `ddd, MMM D, YYYY ${currentTimeFormat}`;

  let eventDate = "";
  let locationString = `${guessEventLocationType(location)?.label || location} ${meetingUrl}`;

  if (isEditingMode) {
    endTime = "{EVENT_END_TIME}";
    eventName = "{EVENT_NAME}";
    timeZone = "{TIMEZONE}";
    locationString = "{LOCATION} {MEETING_URL}";
    otherPerson = action === WorkflowActions.EMAIL_ATTENDEE ? "{ORGANIZER}" : "{ATTENDEE}";
    name = action === WorkflowActions.EMAIL_ATTENDEE ? "{ATTENDEE}" : "{ORGANIZER}";
    eventDate = `{EVENT_DATE_${dateTimeFormat}}`;
  } else {
    eventDate = dayjs(startTime).tz(timeZone).locale(locale).format(dateTimeFormat);

    endTime = dayjs(endTime).tz(timeZone).locale(locale).format(currentTimeFormat);
  }

  const emailSubject = `${t("reminder")}: ${eventName} - ${eventDate}`;

  const introHtml = `<body>${t("hi")}${name ? ` ${name}` : ""},<br><br>${t?.(
    "email_reminder_upcoming_event_notice"
  )}<br><br>`;

  const eventHtml = `<div><strong class="editor-text-bold">${t(
    "event_upper_case"
  )}: </strong></div>${eventName}<br><br>`;

  const dateTimeHtml = `<div><strong class="editor-text-bold">${t(
    "date_and_time"
  )}: </strong></div>${eventDate} - ${endTime} (${timeZone})<br><br>`;

  const attendeeHtml = `<div><strong class="editor-text-bold">${t("attendees")}: </strong></div>${t(
    "you_and_conjunction"
  )} ${otherPerson}<br><br>`;

  const locationHtml = `<div><strong class="editor-text-bold">${t(
    "location"
  )}: </strong></div>${locationString}<br><br>`;

  const branding =
    !isBrandingDisabled && !isEditingMode ? `<br><br>_<br><br>${t("scheduling_by")} ${APP_NAME}` : "";

  const endingHtml = `${branding}</body>`;

  const emailBody = introHtml + eventHtml + dateTimeHtml + attendeeHtml + locationHtml + endingHtml;

  return { emailSubject, emailBody };
};

export default emailReminderTemplate;

export const plainTextTemplate = `Hi {ORGANIZER},This is a reminder about your upcoming event.Event: {EVENT_NAME}Date & Time: {EVENT_DATE_ddd, MMM D, YYYY h:mma} - {EVENT_END_TIME} ({TIMEZONE})Attendees: You & {ATTENDEE}Location: {LOCATION} {MEETING_URL}`;
