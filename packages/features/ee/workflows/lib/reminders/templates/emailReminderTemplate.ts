import { WorkflowActions } from "@prisma/client";

import dayjs from "@calcom/dayjs";
import { APP_NAME } from "@calcom/lib/constants";

const emailReminderTemplate = (
  isEditingMode: boolean,
  action?: WorkflowActions,
  startTime?: string,
  endTime?: string,
  eventName?: string,
  timeZone?: string,
  otherPerson?: string,
  name?: string,
  isBrandingDisabled?: boolean
) => {
  let eventDate = "";

  if (isEditingMode) {
    endTime = "{EVENT_END_TIME}";
    eventName = "{EVENT_NAME}";
    timeZone = "{TIMEZONE}";
    otherPerson = action === WorkflowActions.EMAIL_ATTENDEE ? "{ORGANIZER}" : "{ATTENDEE}";
    name = action === WorkflowActions.EMAIL_ATTENDEE ? "{ATTENDEE}" : "{ORGANIZER}";
    eventDate = "{EVENT_DATE_ddd, MMM D, YYYY H:mmA}";
  } else {
    eventDate = dayjs(startTime).tz(timeZone).format("ddd, MMM D, YYYY H:mmA");

    endTime = dayjs(endTime).tz(timeZone).format("H:mmA");
  }
  const emailSubject = `Reminder: ${eventName} - ${eventDate}`;

  const introHtml = `<body>Hi${
    name ? " " + name : ""
  },<br><br>This is a reminder about your upcoming event.<br><br>`;

  const eventHtml = `<div><strong class="editor-text-bold">Event:</strong></div>${eventName}<br><br>`;

  const dateTimeHtml = `<div><strong class="editor-text-bold">Date & Time:</strong></div>${eventDate} - ${endTime} (${timeZone})<br><br>`;

  const attendeeHtml = `<div><strong class="editor-text-bold">Attendees:</strong></div>You & ${otherPerson}<br><br>`;

  const branding = !isBrandingDisabled && !isEditingMode ? `<br><br>_<br><br>Scheduling by ${APP_NAME}` : "";

  const endingHtml = `This reminder was triggered by a Workflow in Cal.${branding}</body>`;

  const emailBody = introHtml + eventHtml + dateTimeHtml + attendeeHtml + endingHtml;

  return { emailSubject, emailBody };
};

export default emailReminderTemplate;
