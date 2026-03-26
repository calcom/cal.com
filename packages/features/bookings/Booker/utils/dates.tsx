import { formatDateTime, formatDateTimeRange } from "@calcom/lib/dateTimeFormatter";
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

  const formattedDate = formatDateTime(startDate, {
    locale: language,
    timeZone,
    dateStyle: "full",
  });

  const formattedTime = formatDateTime(startDate, {
    locale: language,
    timeZone,
    timeStyle: "short",
    hour12: timeFormat === TimeFormat.TWELVE_HOUR,
  });

  return {
    date: formattedDate,
    time: timeFormat === TimeFormat.TWELVE_HOUR ? formattedTime.toLowerCase() : formattedTime,
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

  const formattedDate = formatDateTimeRange(startDate, endDate, {
    locale: language,
    timeZone,
    dateStyle: "full",
  });

  const formattedTime = formatDateTimeRange(startDate, endDate, {
    locale: language,
    timeZone,
    timeStyle: "short",
    hour12: timeFormat === TimeFormat.TWELVE_HOUR,
  });

  return {
    date: formattedDate,
    time: timeFormat === TimeFormat.TWELVE_HOUR ? formattedTime.toLowerCase() : formattedTime,
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
