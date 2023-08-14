import { useContext } from "react";
import { useStore } from "zustand";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { classNames } from "@calcom/lib";
import type { DateRange } from "@calcom/lib/date-ranges";

import { DAY_CELL_WIDTH } from "../constants";
import { TBContext } from "../store";

interface TimeDialProps {
  timezone: string;
  dateRanges?: DateRange[];
}

function isMidnight(h: number) {
  return h <= 5 || h >= 22;
}

function isCurrentHourInRange({
  dateRanges,
  cellDate,
  offset,
}: {
  dateRanges?: DateRange[];
  cellDate: Dayjs;
  offset: number;
}) {
  if (!dateRanges) return false;
  const currentHour = cellDate.hour();

  return dateRanges.some((time) => {
    if (!time) null;

    const startHour = dayjs(time.start).subtract(offset, "hour");
    const endHour = dayjs(time.end).subtract(offset, "hour");

    // If not same day number then we don't care

    if (startHour.day() !== cellDate.day()) {
      console.log("[Skipping]", startHour.day(), cellDate.day());
      return false;
    }

    // this is a weird way of doing this
    const newDate = dayjs(time.start).set("hour", currentHour);

    return newDate.isBetween(startHour, endHour, undefined, "[)"); // smiley faces or something
  });
}

export function TimeDial({ timezone, dateRanges }: TimeDialProps) {
  const store = useContext(TBContext);
  if (!store) throw new Error("Missing TBContext.Provider in the tree");
  const getTzInfo = useStore(store, (s) => s.getTimezone);
  const browsingDate = useStore(store, (s) => s.browsingDate);
  const tz = getTzInfo(timezone);

  if (!tz) return null;

  const { name } = tz; // TZ of the USER

  const usersTimezoneDate = dayjs(browsingDate).tz(name);

  const nowDate = dayjs(browsingDate);

  const offset = (nowDate.utcOffset() - usersTimezoneDate.utcOffset()) / 60;

  const hours = Array.from({ length: 24 }, (_, i) => i - offset + 1);

  const days = [
    hours.filter((i) => i < 0).map((i) => (i + 24) % 24),
    hours.filter((i) => i >= 0 && i < 24),
    hours.filter((i) => i >= 24).map((i) => i % 24),
  ];

  if (dateRanges && dateRanges?.length > 0) {
    console.log("==================");
    console.log(dateRanges);
  }

  return (
    <>
      <div className="flex items-end overflow-auto text-sm">
        {days.map((day, i) => {
          if (!day.length) return null;
          const dateWithDaySet = usersTimezoneDate.add(i - 1, "day");
          return (
            <div key={i} className={classNames("flex flex-none overflow-hidden rounded-lg border border-2")}>
              {day.map((h) => {
                const hours = Math.floor(h); // Whole number part
                const fractionalHours = h - hours; // Decimal part

                // Convert the fractional hours to minutes
                const minutes = fractionalHours * 60;
                const hourSet = dateWithDaySet.set("hour", h).set("minute", minutes);

                // const isInRange = false;
                const isInRange = isCurrentHourInRange({
                  dateRanges,
                  offset,
                  cellDate: hourSet,
                });

                return (
                  <div
                    key={h}
                    className={classNames(
                      "flex h-8 flex-col items-center justify-center",
                      isInRange ? "text-emphasis bg-success" : "",
                      hours ? "" : "bg-subtle font-medium"
                    )}
                    style={{
                      width: `${DAY_CELL_WIDTH}px`,
                    }}>
                    {hours ? (
                      <div title={hourSet.format("DD/MM HH:mm")}>
                        <div className="flex flex-col text-center text-xs leading-3">
                          <span>{hours}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col text-center text-xs leading-3">
                        <span>{hourSet.format("MMM")}</span>
                        <span>{hourSet.format("DD")}</span>
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
