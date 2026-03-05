import dayjs from "@calcom/dayjs";

const hasUtcOrOffsetSuffix = (timeInput: string) => /(?:[zZ]|[+-]\d{2}:\d{2})$/.test(timeInput);

export const getDateTimeInUtc = (timeInput: string, timeZone?: string) => {
  if (hasUtcOrOffsetSuffix(timeInput)) {
    return dayjs(timeInput).utc();
  }

  if (timeZone) {
    return dayjs.tz(timeInput, timeZone).utc();
  }

  return dayjs.utc(timeInput);
};
