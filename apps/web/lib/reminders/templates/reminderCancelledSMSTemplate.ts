import dayjs from "dayjs";

const reminderCancelledSMSTemplate = (
  title: string,
  organizerName: string,
  startTime: string,
  attendeeTimeZone: string
) => {
  const templateOne = `Hi, your meeting '${title}' with
  ${organizerName} at ${dayjs(startTime).format("YYYY MMM D h:mmA")} ${attendeeTimeZone} was cancelled.`;

  //Twilio recomments message to be no longer than 320 characters
  if (templateOne.length <= 320) return templateOne;

  //Twilio supports up to 1600 characters
  const templateThree = `Hi, your meeting with ${organizerName} at ${dayjs(startTime).format(
    "MMM D h:mmA"
  )} was cancelled`;

  //Twilio supports up to 1600 characters
  if (templateThree.length <= 1600) return templateThree;
};

export default reminderCancelledSMSTemplate;
