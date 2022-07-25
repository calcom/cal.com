import dayjs from "@calcom/dayjs";

const smsReminderTemplate = (
  startTime: string,
  eventName: string,
  timeZone: string,
  attendee: string,
  name?: string
) => {
  const templateOne = `Hi${name ? ` ${name}` : ``}, this is a reminder that your meeting (${eventName}) with
  ${attendee} is on ${dayjs(startTime).tz(timeZone).format("MMM D")} at ${dayjs(startTime)
    .tz(timeZone)
    .format("h:mmA")} ${timeZone}`;

  //Twilio recomments message to be no longer than 320 characters
  if (templateOne.length <= 320) return templateOne;

  const templateTwo = `Hi, this is a reminder that your meeting with ${attendee} is on ${dayjs(startTime)
    .tz(timeZone)
    .format("MMM D")} at ${dayjs(startTime).tz(timeZone).format("h:mmA")} ${timeZone}`;

  //Twilio supports up to 1600 characters
  if (templateTwo.length <= 1600) return templateTwo;

  return null;
};

export default smsReminderTemplate;
