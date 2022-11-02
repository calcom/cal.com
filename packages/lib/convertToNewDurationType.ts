export const MINUTES_IN_HOUR = 60;
export const MINUTES_IN_DAY = 1440;
export const HOURS_IN_DAY = 24;

export default function convertToNewDurationType(prevType: string, newType: string, prevValue: number) {
  if (newType === "minutes") {
    if (prevType === "hours") {
      console.log("hours to minutes", prevValue * MINUTES_IN_HOUR);
      return prevValue * MINUTES_IN_HOUR;
    }
    if (prevType === "days") {
      console.log("days to minutes", prevValue * MINUTES_IN_DAY);
      return prevValue * MINUTES_IN_DAY;
    }
  } else if (newType === "hours") {
    if (prevType === "minutes") {
      console.log("minutes to hours", prevValue / MINUTES_IN_HOUR);
      return prevValue / MINUTES_IN_HOUR;
    }
    if (prevType === "days") {
      console.log("days to hours", prevValue * HOURS_IN_DAY);
      return prevValue * HOURS_IN_DAY;
    }
  } else if (newType === "days") {
    if (prevType === "minutes") {
      console.log("minutes to days", prevValue / MINUTES_IN_DAY);
      return prevValue / MINUTES_IN_DAY;
    }
    if (prevType === "hours") {
      console.log("hours to days", prevValue / HOURS_IN_DAY);
      return prevValue / HOURS_IN_DAY;
    }
  }
  return prevValue;
}
