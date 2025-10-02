import dayjs from "@calcom/dayjs";

export const isLastWeekOfMonth = (date: string) => {
  const dateObj = dayjs(date);
  const currentMonth = dateObj.month();
  const endOfWeek = dateObj.endOf("week");

  // If the end of current week is in a different month, we're in the last week
  return endOfWeek.month() !== currentMonth;
};
