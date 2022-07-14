import dayjs from "@calcom/dayjs";

const emailReminderTemplate = (
  startTime: string,
  eventName: string,
  attendeeTimeZone: string,
  attendee: string,
  name: string
) => {
  const templateSubject = `Reminder: ${eventName} at ${dayjs(startTime).format("YYYY MMM D h:mmA")}`;

  const templateBody = `Hi ${name},\n\nThis is a reminder that your meeting (${eventName}) with ${attendee} is on ${dayjs(
    startTime
  )
    .tz(attendeeTimeZone)
    .format("YYYY MMM D")} at ${dayjs(startTime).tz(attendeeTimeZone).format("h:mmA")} ${attendeeTimeZone}.`;

  const emailContent = { subject: templateSubject, body: templateBody };

  return emailContent;
};

export default emailReminderTemplate;
