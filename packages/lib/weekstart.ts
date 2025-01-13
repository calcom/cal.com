import { weekdayNames } from "./weekday";

// returns index of input weekName(long) from array starting from Sunday
// as fall back returns 0 i.e. Sunday
export function weekStartNum(weekName = "Sunday") {
  const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const idx = weekDays.indexOf(weekName);
  return (idx !== -1 ? idx : 0) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

// sorts the availability strings based on the weekStart
export function sortAvailabilityStrings(language: string, weekStart = "Sunday") {
  return (a: string, b: string) => {
    const weekNames = weekdayNames(language, weekStartNum(weekStart), "short");
    const weekIndex = (day: string) => {
      for (let i = 0; i < weekNames.length; i++) {
        if (day.includes(weekNames[i])) return i;
      }
      return -1;
    };
    return weekIndex(a) - weekIndex(b);
  };
}
