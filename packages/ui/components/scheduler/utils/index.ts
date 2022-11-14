// By default starts on Sunday (Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday)
export function weekdayDates(weekStart = 0, startDate: Date, length = 6) {
  const tmpStartDate = startDate;
  while (tmpStartDate.getDay() !== weekStart) {
    tmpStartDate.setDate(tmpStartDate.getDate() - 1);
  }
  return {
    startDate: tmpStartDate,
    endDate: new Date(tmpStartDate.getTime() + length * 24 * 60 * 60 * 1000),
  };
}
