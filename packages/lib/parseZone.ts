import dayjs from "@calcom/dayjs";

const ISO8601_OFFSET_FORMAT = /^(.*)([+-])(\d{2}):(\d{2})|(Z)$/;

// @see https://github.com/iamkun/dayjs/issues/651#issuecomment-763033265
// decorates dayjs in order to keep the utcOffset of the given date string
// ; natively dayjs auto-converts to local time & losing utcOffset info.
export function parseZone(
  date?: dayjs.ConfigType,
  format?: dayjs.OptionType,
  locale?: string,
  strict?: boolean
) {
  if (typeof date !== "string") {
    return dayjs(date, format, locale, strict);
  }
  const match = date.match(ISO8601_OFFSET_FORMAT);
  if (match === null) {
    return;
  }
  if (match[0] === "Z") {
    return dayjs(
      date,
      {
        utc: true,
        ...(typeof format === "string" ? { format } : { ...format }),
      },
      locale,
      strict
    );
  }
  const [, dateTime, sign, tzHour, tzMinute] = match;
  const uOffset: number = parseInt(tzHour) * 60 + parseInt(tzMinute, 10);
  const offset = sign === "+" ? uOffset : -uOffset;

  return dayjs(
    dateTime,
    {
      $offset: offset,
      ...(typeof format === "string" ? { format } : { ...format }),
    } as dayjs.OptionType & { $offset: number },
    locale,
    strict
  );
}
