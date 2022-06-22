import dayjs from "dayjs";

const emailReminderTemplate = (
  name: string,
  startTime: string,
  eventName: string,
  attendeeTimeZone: string,
  attendee: string
) => {
  const templateSubject = `Reminder: ${eventName} at ${dayjs(startTime).format("YYYY MMM D h:mmA")}`;
  const templateBody = `Hi ${name},\n\n this is a reminder that your meeting (${eventName}) with ${attendee} is at at ${dayjs(
    startTime
  ).format("YYYY MMM D h:mmA")} ${attendeeTimeZone}.`;

  return [templateSubject, templateBody];
};

export default emailReminderTemplate;
