import dayjs from "@calcom/dayjs";
import type { TimeFormat } from "@calcom/lib/timeFormat";

interface EventFromToTime {
  date: string;
  duration: number | null;
  timeFormat: TimeFormat;
  timeZone: string;
  language: string;
}

export const formatEventFromToTime = ({
  date,
  duration,
  timeFormat,
  timeZone,
  language,
}: EventFromToTime) => {
  const start = dayjs(date).tz(timeZone);
  const end = duration ? start.add(duration, "minute") : null;
  const formattedDate = `${start.format("dddd")}, ${start
    .toDate()
    .toLocaleDateString(language, { dateStyle: "long" })}`;
  const formattedTime = `${start.format(timeFormat)} ${end ? `– ${end.format(timeFormat)}` : ``}`;

  return { date: formattedDate, time: formattedTime };
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
