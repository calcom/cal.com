import dayjs from "@calcom/dayjs";

const emailReminderTemplate = (
  startTime: string,
  eventName: string,
  timeZone: string,
  attendee: string,
  name: string
) => {
  const templateSubject = `Reminder: ${eventName} at ${dayjs(startTime)
    .tz(timeZone)
    .format("YYYY MMM D h:mmA")}`;

  const templateBody = `Hi ${name},\n\nThis is a reminder that your meeting (${eventName}) with ${attendee} is on ${dayjs(
    startTime
  )
    .tz(timeZone)
    .format("YYYY MMM D")} at ${dayjs(startTime).tz(timeZone).format("h:mmA")} ${timeZone}.`;

  const emailContent = { subject: templateSubject, body: templateBody };

  return emailContent;
};

export default emailReminderTemplate;
