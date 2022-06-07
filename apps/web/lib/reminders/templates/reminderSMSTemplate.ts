import dayjs from "dayjs";

const reminderSMSTemplate = (
  title: string,
  organizerName: string,
  startTime: string,
  attendeeTimeZone: string
) => {
  // Twilio maximum character length for a single message is 160 characters
  const templateOne = `Hi, this is a reminder that you have a ${title} with
  ${organizerName} at ${dayjs(startTime).format("YYYY MMM D h:mmA")} ${attendeeTimeZone}`;

  if (templateOne.length <= 160) return templateOne;

  const templateTwo = `Hi, this is a reminder that you have a ${title} with
  ${organizerName} at ${dayjs(startTime).format("MMM D h:mmA")}`;

  if (templateTwo.length <= 160) return templateTwo;

  const templateThree = `Hi, this is a reminder that you have a ${title} at ${dayjs(startTime).format(
    "MMM D h:mmA"
  )}`;

  if (templateThree.length <= 160) return templateThree;
};

export default reminderSMSTemplate;
