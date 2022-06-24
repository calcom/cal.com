import dayjs from "dayjs";

const emailReminderTemplate = (
  startTime: string,
  eventName: string,
  attendeeTimeZone: string,
  attendee: string,
  name: string
) => {
  const templateSubject = `Reminder: ${eventName} at ${dayjs(startTime).format("YYYY MMM D h:mmA")}`;

  const templateBody = `Hi ${name},\n\n this is a reminder that your meeting (${eventName}) with ${attendee} is at ${dayjs(
    startTime
  ).format("YYYY MMM D h:mmA")} ${attendeeTimeZone}.`;

  const emailContent = { subject: templateSubject, body: templateBody };

  return emailContent;
};

export default emailReminderTemplate;
