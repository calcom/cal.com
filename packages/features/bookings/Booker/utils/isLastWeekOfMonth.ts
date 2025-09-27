import dayjs from "@calcom/dayjs";

export const isLastWeekOfMonth = (date: string) => {
  const currentMonth = dayjs(date).month();
  const endOfWeek = dayjs(date).endOf("week");

  // If the end of current week is in a different month, we're in the last week
  return endOfWeek.month() !== currentMonth;
};
