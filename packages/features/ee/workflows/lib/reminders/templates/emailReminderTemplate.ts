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
  attendee?: string,
  name?: string
) => {
  let eventDateSubject = "";
  let eventDateBody = "";

  if (isEditingMode) {
    startTime = "{EVENT_TIME_H:mmA}";
    endTime = "{EVENT_END_TIME_H:mmA}";
    eventName = "{EVENT_NAME}";
    timeZone = "{TIMEZONE}";
    attendee =
      action === WorkflowActions.EMAIL_ATTENDEE || action === WorkflowActions.SMS_ATTENDEE
        ? "{ORGANIZER}"
        : "{ATTENDEE}";
    name =
      action === WorkflowActions.EMAIL_ATTENDEE || action === WorkflowActions.SMS_ATTENDEE
        ? "{ATTENDEE}"
        : "{ORGANIZER}";
    eventDateSubject = "{EVENT_DATE_ddd, MMM D, YYYY}";
    eventDateBody = "{EVENT_DATE_YYYY MMM D}";
  } else {
    eventDateSubject = dayjs(startTime).tz(timeZone).format("ddd, MMM D, YYYY");

    startTime = dayjs(startTime).tz(timeZone).format("H:mmA");

    endTime = dayjs(endTime).tz(timeZone).format("H:mmA");

    eventDateBody = dayjs(startTime).tz(timeZone).format("YYYY MMM D");
  }

  const emailSubject = `Reminder: ${eventName} - ${eventDateSubject} ${startTime}`;

  const templateBodyText = `Hi ${name},this is a reminder that your meeting (${eventName}) with ${attendee} is on ${startTime} ${timeZone}.`;

  const introHtml = `<body>Hi${
    name ? " " + name : ""
  },<br><br>This is a reminder about your upcoming event.<br><br>`;

  const eventHtml = `<div style="font-weight: bold;">Event:</div>${eventName}<br><br>`;

  const dateTimeHtml = `<div style="font-weight: bold;">Date & Time:</div>${eventDateSubject} ${startTime} - ${endTime} (${timeZone})<br><br>`;

  const attendeeHtml = `<div style="font-weight: bold;">Attendees:</div>You & ${attendee}<br><br>`;

  const endingHtml = `This reminder was triggered by a Workflow in Cal.<br><br>_<br><br>Scheduling by ${APP_NAME}</body>`;

  const templateBodyHtml = introHtml + eventHtml + dateTimeHtml + attendeeHtml + endingHtml;

  const emailBody = { text: templateBodyText, html: templateBodyHtml };

  return { emailSubject, emailBody };
};

export default emailReminderTemplate;
