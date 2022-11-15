import dayjs from "@calcom/dayjs";

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
export type GridCellToDateProps = {
  day: Date;
  gridCellIdx: number;
  totalGridCells: number;
  selectionLength: number;
  startHour: number;
};

export function gridCellToDateTime({
  day,
  gridCellIdx,
  totalGridCells,
  selectionLength,
  startHour,
}: GridCellToDateProps) {
  // endHour - startHour = selectionLength
  const minutesInSelection = (selectionLength + 1) * 60;
  const minutesPerCell = minutesInSelection / totalGridCells;
  const minutesIntoSelection = minutesPerCell * gridCellIdx;

  // Add startHour since we use StartOfDay for day props. This could be improved by changing the getDaysBetweenDates function
  // To handle the startHour+endHour
  const cellDateTime = dayjs(day).add(minutesIntoSelection, "minutes").add(startHour, "hours");
  return cellDateTime;
}

export function getDaysBetweenDates(dateFrom: Date, dateTo: Date) {
  const dates = []; // this is as dayjs date
  let startDate = dayjs(dateFrom).utc().hour(0).minute(0).second(0).millisecond(0);
  dates.push(startDate);
  const endDate = dayjs(dateTo).utc().hour(0).minute(0).second(0).millisecond(0);
  while (startDate.isBefore(endDate)) {
    dates.push(startDate.add(1, "day"));
    startDate = startDate.add(1, "day");
  }
  return dates;
}

export function getHoursToDisplay(startHour: number, endHour: number) {
  const dates = []; // this is as dayjs date
  let startDate = dayjs("1970-01-01").utc().hour(startHour);
  dates.push(startDate);
  const endDate = dayjs("1970-01-01").utc().hour(endHour);
  while (startDate.isBefore(endDate)) {
    dates.push(startDate.add(1, "hour"));
    startDate = startDate.add(1, "hour");
  }
  return dates;
}
