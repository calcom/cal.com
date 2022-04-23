import dayjs from "dayjs";

// converts a date to 2022-04-25 for example.
export const yyyymmdd = (date: Date) => dayjs(date).format("YYYY-MM-DD");

export const daysInMonth = (date: Date) => dayjs(date).daysInMonth();
