import { TimeFormat } from "@calcom/lib/timeFormat";

interface EventFromToTime {
  date: string;
  duration: number | null;
  timeFormat: TimeFormat;
  timeZone: string;
  language: string;
}

interface EventFromTime {
  date: string;
  timeFormat: TimeFormat;
  timeZone: string;
  language: string;
}

export const formatEventFromTime = ({ date, timeFormat, timeZone, language }: EventFromTime) => {
  const startDate = new Date(date);
  const formattedDate = new Intl.DateTimeFormat(language, {
    timeZone,
    dateStyle: "full",
  }).format(startDate);

  const formattedTime = new Intl.DateTimeFormat(language, {
    timeZone,
    timeStyle: "short",
    hour12: timeFormat === TimeFormat.TWELVE_HOUR ? true : false,
  }).format(startDate);

  return {
    date: formattedDate,
    time:
      timeFormat === TimeFormat.TWELVE_HOUR
        ? formattedTime.toLowerCase()
        : formattedTime,
  };
};

export const formatEventFromToTime = ({
  date,
  duration,
  timeFormat,
  timeZone,
  language,
}: EventFromToTime) => {
  const startDate = new Date(date);
  const endDate = duration
    ? new Date(new Date(date).setMinutes(startDate.getMinutes() + duration))
    : startDate;

  const formattedDate = new Intl.DateTimeFormat(language, {
    timeZone,
    dateStyle: "full",
  }).formatRange(startDate, endDate);

  const formattedTime = new Intl.DateTimeFormat(language, {
    timeZone,
    timeStyle: "short",
    hour12: timeFormat === TimeFormat.TWELVE_HOUR ? true : false,
  }).formatRange(startDate, endDate);

  return {
    date: formattedDate,
    time:
      timeFormat === TimeFormat.TWELVE_HOUR
        ? formattedTime.toLowerCase()
        : formattedTime,
  };
};

export const FromToTime = (props: EventFromToTime) => {
  const formatted = formatEventFromToTime(props);
  return (
    <>
      {formatted.date}
      <br />
      {formatted.time}
    </>
  );
};

export const FromTime = (props: EventFromTime) => {
  const formatted = formatEventFromTime(props);
  return (
    <>
      {formatted.date}, {formatted.time}
    </>
  );
};
