import dayjs from "@calcom/dayjs";

const emailReminderTemplate = (
  startTime: string,
  eventName: string,
  timeZone: string,
  attendee: string,
  name: string
) => {
  const emailSubject = `Reminder: ${eventName} on ${dayjs(startTime)
    .tz(timeZone)
    .format("YYYY MMM D")} at ${dayjs(startTime).tz(timeZone).format("h:mmA")} ${timeZone}.`;

  const templateBodyText = `Hi ${name}, this is a reminder that your meeting (${eventName}) with ${attendee} is on ${dayjs(
    startTime
  )
    .tz(timeZone)
    .format("YYYY MMM D")} at ${dayjs(startTime).tz(timeZone).format("h:mmA")} ${timeZone}.`;

  const templateBodyHtml = `<body>Hi ${name},<br><br>This is a reminder that your meeting (${eventName}) with ${attendee} is on ${dayjs(
    startTime
  )
    .tz(timeZone)
    .format("YYYY MMM D")} at ${dayjs(startTime).tz(timeZone).format("h:mmA")} ${timeZone}.<body>`;

  const emailBody = { text: templateBodyText, html: templateBodyHtml };

  return { emailSubject, emailBody };
};

export default emailReminderTemplate;
