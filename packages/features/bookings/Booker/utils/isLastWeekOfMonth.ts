import dayjs from "@calcom/dayjs";

export const isLastWeekOfMonth = (date: dayjs.Dayjs) => {
  const currentMonth = date.month();
  const endOfWeek = date.endOf("week");

  // If the end of current week is in a different month, we're in the last week
  return endOfWeek.month() !== currentMonth;
};
