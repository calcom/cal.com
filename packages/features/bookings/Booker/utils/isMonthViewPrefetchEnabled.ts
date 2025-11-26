import dayjs from "@calcom/dayjs";

export const isMonthViewPrefetchEnabled = (date: string, month: string | null) => {
  const isValidDate = dayjs(date).isValid();
  const twoWeeksAfter = dayjs(month).startOf("month").add(2, "week");
  const isSameMonth = dayjs().isSame(dayjs(month), "month");
  const isAfter2Weeks = dayjs().isAfter(twoWeeksAfter);

  if (isAfter2Weeks && (!isValidDate || isSameMonth)) {
    return true;
  }

  return false;
};
