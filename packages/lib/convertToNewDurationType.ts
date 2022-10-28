export const MINUTES_IN_HOUR = 60;
export const MINUTES_IN_DAY = 1440;
export const HOURS_IN_DAY = 24;

export default function convertToNewDurationType(prevType: string, newType: string, prevValue: number) {
  if (newType == "minutes") {
    if (prevType == "hours") {
      return prevValue * MINUTES_IN_HOUR;
    }
    if (prevType == "days") {
      return prevValue * MINUTES_IN_DAY;
    }
  } else if (newType == "hours") {
    if (prevType == "minutes") {
      return prevValue / MINUTES_IN_HOUR;
    }
    if (prevType == "days") {
      return prevValue * HOURS_IN_DAY;
    }
  } else if (newType == "days") {
    if (prevType == "minutes") {
      return prevValue / MINUTES_IN_DAY;
    }
    if (prevType == "hours") {
      return prevValue / HOURS_IN_DAY;
    }
  }
  return prevValue;
}
