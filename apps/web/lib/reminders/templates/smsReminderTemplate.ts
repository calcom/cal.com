import dayjs from "dayjs";

const smsReminderTemplate = (
  startTime: string,
  eventName: string,
  attendeeTimeZone: string,
  attendee: string,
  name?: string
) => {
  const templateOne = `Hi${
    !!name && ` ${name}`
  }, this is a reminder that you have a meeting (${eventName}) with
  ${attendee} at ${dayjs(startTime).format("YYYY MMM D h:mmA")} ${attendeeTimeZone}`;

  //Twilio recomments message to be no longer than 320 characters
  if (templateOne.length <= 320) return templateOne;

  //Twilio supports up to 1600 characters
  const templateThree = `Hi, this is a reminder that you have a meeting with ${attendee} at ${dayjs(
    startTime
  ).format("MMM D h:mmA")}`;

  //Twilio supports up to 1600 characters
  if (templateThree.length <= 1600) return templateThree;
};

export default smsReminderTemplate;
