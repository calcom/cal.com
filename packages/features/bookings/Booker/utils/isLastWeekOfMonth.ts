import dayjs from "@calcom/dayjs";

export const isLastWeekOfMonth = (date: string): boolean => {
  const dateObj = dayjs(date);
  const currentMonth = dateObj.month();
  // we wanna use ISO Week plugin here as it provides consistent, standardized week semantics
  // thsi also aligns with international standards
  const endOfWeek = dateObj.endOf("isoWeek");

  // if the end of current week is in a different month, we're in the last week
  return endOfWeek.month() !== currentMonth;
};
