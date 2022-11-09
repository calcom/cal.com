export const MINUTES_IN_HOUR = 60;
export const MINUTES_IN_DAY = 1440;
export const HOURS_IN_DAY = 24;

export default function convertToNewDurationType(
  prevType: string | "minutes" | "hours" | "days",
  newType: string | "minutes" | "hours" | "days",
  prevValue: number
) {
  const round = Math.ceil;
  if (newType === "minutes") {
    if (prevType === "hours") {
      return round(prevValue * MINUTES_IN_HOUR);
    }
    if (prevType === "days") {
      return round(prevValue * MINUTES_IN_DAY);
    }
    if (prevType === "minutes") {
      return round(prevValue);
    }
  } else if (newType === "hours") {
    if (prevType === "minutes") {
      return round(prevValue / MINUTES_IN_HOUR);
    }
    if (prevType === "days") {
      return round(prevValue * HOURS_IN_DAY);
    }
    if (prevType === "hours") {
      return round(prevValue);
    }
  } else if (newType === "days") {
    if (prevType === "days") {
      return round(prevValue);
    }
    if (prevType === "minutes") {
      return round(prevValue / MINUTES_IN_DAY);
    }
    if (prevType === "hours") {
      return round(prevValue / HOURS_IN_DAY);
    }
  }
  return round(prevValue);
}
