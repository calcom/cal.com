import { nameOfDay } from "../lib/nameOfDay";
import type { Availability } from "../types";

export function availabilityAsString(
  availability: Availability,
  { locale, hour12 }: { locale?: string; hour12?: boolean }
) {
  const weekSpan = (availability: Availability) => {
    const days = availability.days.slice(1).reduce(
      (days, day) => {
        if (days[days.length - 1].length === 1 && days[days.length - 1][0] === day - 1) {
          // append if the range is not complete (but the next day needs adding)
          days[days.length - 1].push(day);
        } else if (days[days.length - 1][days[days.length - 1].length - 1] === day - 1) {
          // range complete, overwrite if the last day directly preceeds the current day
          days[days.length - 1] = [days[days.length - 1][0], day];
        } else {
          // new range
          days.push([day]);
        }
        return days;
      },
      [[availability.days[0]]] as number[][]
    );
    return days
      .map((dayRange) => dayRange.map((day) => nameOfDay(locale, day, "short")).join(" - "))
      .join(", ");
  };

  const timeSpan = (availability: Availability) => {
    console.log("start time", availability.startTime, typeof availability.startTime);

    return `${new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "numeric", hour12 }).format(
      new Date(availability.startTime.slice(0, -1))
    )} - ${new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "numeric", hour12 }).format(
      new Date(availability.endTime.slice(0, -1))
    )}`;
  };

  return `${weekSpan(availability)}, ${timeSpan(availability)}`;
}
