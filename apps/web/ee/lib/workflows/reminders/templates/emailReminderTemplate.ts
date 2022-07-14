import dayjs from "@calcom/dayjs";

const emailReminderTemplate = (
  startTime: string,
  eventName: string,
  attendeeTimeZone: string,
  attendee: string,
  name: string
) => {
  const templateSubject = `Reminder: ${eventName} at ${dayjs(startTime).format("YYYY MMM D h:mmA")}`;

  const templateBody = `Hi ${name},\n\n this is a reminder that your meeting (${eventName}) with ${attendee} is on ${dayjs(
    startTime
  ).format("YYYY MMM D")} at ${dayjs(startTime).format("h:mmA")} ${attendeeTimeZone}.`;

  const emailContent = { subject: templateSubject, body: templateBody };

  return emailContent;
};

export default emailReminderTemplate;
