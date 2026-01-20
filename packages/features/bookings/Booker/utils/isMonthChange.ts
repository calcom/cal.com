export const isMonthChange = (currentMonth: number, nextMonth: number) => {
  if (isNaN(currentMonth) || isNaN(nextMonth)) {
    return false;
  }

  if (currentMonth === nextMonth) {
    return false;
  }

  return true;
};
