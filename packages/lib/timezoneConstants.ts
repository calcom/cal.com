import dayjs from "@calcom/dayjs";

export const IS_EUROPE = dayjs.tz.guess()?.indexOf("Europe") !== -1;
export const CURRENT_TIMEZONE = dayjs.tz.guess() !== "Etc/Unknown" ? dayjs.tz.guess() : "Europe/London";
