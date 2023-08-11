import { useContext } from "react";
import { useStore } from "zustand";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { classNames } from "@calcom/lib";
import type { WorkingHours } from "@calcom/lib/date-ranges";

import { DAY_CELL_WIDTH } from "../constants";
import { TBContext } from "../store";

type Availability = Omit<WorkingHours, "userId">;

interface TimeDialProps {
  timezone: string;
  avaibility?: Availability[];
}

function isMidnight(h: number) {
  return h <= 5 || h >= 22;
}

function isCurrentHourInRange(dayTime: Availability[], hourSetDate: Dayjs): boolean {
  const currentHour = hourSetDate.hour();
  const currentMinute = hourSetDate.minute();
  const currentDay = hourSetDate.day(); // Retrieve the current day of week (0-6, where 0 is Sunday)

  return dayTime.some((time: Availability) => {
    return time.days.some((day: number) => {
      if (currentDay !== day) return false;
      const startHour = dayjs(time.startTime).hour();
      const startMinute = dayjs(time.startTime).minute();
      const endHour = dayjs(time.endTime).hour();
      const endMinute = dayjs(time.endTime).minute();

      // Check if the current hour and minute are within the start and end time
      if (
        (currentHour === startHour && currentMinute >= startMinute) ||
        (currentHour === endHour && currentMinute <= endMinute) ||
        (currentHour > startHour && currentHour < endHour)
      ) {
        return true;
      }
    });
  });
}

export function TimeDial({ timezone }: TimeDialProps) {
  const store = useContext(TBContext);
  if (!store) throw new Error("Missing BearContext.Provider in the tree");
  const getTzInfo = useStore(store, (s) => s.getTimezone);
  const browsingDate = useStore(store, (s) => s.browsingDate);
  const tz = getTzInfo(timezone);

  if (!tz) return null;

  const { name, offset, abbr } = tz;

  const now = dayjs.utc(browsingDate).tz(name);
  const hours = Array.from({ length: 24 }, (_, i) => i + offset + 1);

  const days = [
    hours.filter((i) => i < 0).map((i) => (i + 24) % 24),
    hours.filter((i) => i >= 0 && i < 24),
    hours.filter((i) => i >= 24).map((i) => i % 24),
  ];

  return (
    <>
      <div className="flex items-end overflow-auto text-sm">
        {days.map((day, i) => {
          if (!day.length) return null;
          const dateWithDaySet = now.add(i - 1, "day");
          return (
            <div key={i} className={classNames("flex flex-none overflow-hidden rounded-lg border border-2")}>
              {day.map((h) => {
                const hourSet = dateWithDaySet.set("hour", h).set("minute", 0);
                const isInRange = isCurrentHourInRange(
                  [
                    {
                      days: [0, 1, 2],
                      startTime: dayjs(hourSet).set("hour", 9).set("minute", 0).toDate(),
                      endTime: dayjs(hourSet).set("hour", 18).set("minute", 0).toDate(),
                    },
                  ],
                  hourSet
                );
                return (
                  <div
                    key={h}
                    className={classNames(
                      "flex h-8 flex-col items-center justify-center",
                      isInRange ? "text-emphasis bg-success" : "",
                      h ? "" : "bg-subtle font-medium"
                    )}
                    style={{
                      width: `${DAY_CELL_WIDTH}px`,
                    }}>
                    {h ? (
                      <div title={dateWithDaySet.format("DD/MM HH:mm")}>{h}</div>
                    ) : (
                      <div className="flex flex-col text-center text-xs leading-3">
                        <span>{dateWithDaySet.format("MMM")}</span>
                        <span>{dateWithDaySet.format("DD")}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}
