import type { MouseEventHandler } from "react";
import { useContext } from "react";
import { useStore } from "zustand";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import type { DateRange } from "@calcom/features/schedules/lib/date-ranges";
import classNames from "@calcom/ui/classNames";

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
}): {
  rangeOverlap?: number;
  isInRange: boolean;
} {
  if (!dateRanges)
    return {
      isInRange: false,
    };
  const currentHour = cellDate.hour();

  let rangeOverlap = 0;

  // yes or no answer whether it's in range.
  const isFullyInRange = dateRanges.some((time) => {
    if (!time) null;

    const startHour = dayjs(time.start).subtract(offset, "hour");
    const endHour = dayjs(time.end).subtract(offset, "hour");

    // If not same day number then we don't care

    if (startHour.day() !== cellDate.day()) {
      return false;
    }

    // this is a weird way of doing this
    const newDate = dayjs(time.start).set("hour", currentHour);

    const diffStart = newDate.diff(startHour, "minutes");
    if (Math.abs(diffStart) < 60 && diffStart != 0) {
      rangeOverlap =
        diffStart < 0
          ? -(Math.floor(startHour.minute() / 15) * 25)
          : Math.floor(startHour.minute() / 15) * 25;
    }

    const diffEnd = newDate.diff(endHour, "minutes");
    if (Math.abs(diffEnd) < 60 && diffEnd != 0) {
      rangeOverlap =
        diffEnd < 0 ? -(Math.floor(endHour.minute() / 15) * 25) : Math.floor(endHour.minute() / 15) * 25;
    }

    return newDate.isBetween(startHour, endHour, undefined, "[)"); // smiley faces or something
  });
  // most common situation, bail early.
  if (isFullyInRange) {
    return {
      isInRange: isFullyInRange,
    };
  }

  return {
    isInRange: !!rangeOverlap,
    rangeOverlap, // value from -75 to 75 to indicate range overlap
  };
}

export function TimeDial({ timezone, dateRanges }: TimeDialProps) {
  const store = useContext(TBContext);
  if (!store) throw new Error("Missing TBContext.Provider in the tree");
  const { browsingDate, emitCellPosition } = useStore(store, ({ browsingDate, emitCellPosition }) => ({
    browsingDate,
    emitCellPosition,
  }));

  const usersTimezoneDate = dayjs(browsingDate).tz(timezone);

  const nowDate = dayjs(browsingDate);

  const offset = (nowDate.utcOffset() - usersTimezoneDate.utcOffset()) / 60;

  const hours = Array.from({ length: 24 }, (_, i) => i - offset + 1);

  const days = [
    hours.filter((i) => i < 0).map((i) => (i + 24) % 24),
    hours.filter((i) => i >= 0 && i < 24),
    hours.filter((i) => i >= 24).map((i) => i % 24),
  ];

  const handleMouseEnter: MouseEventHandler<HTMLDivElement> = (e) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = rect.left; // x position within the element
    const y = rect.top; // y position within the element
    emitCellPosition(x);
  };

  return (
    <>
      <div data-time-dial className="flex items-end justify-center overflow-auto text-sm">
        {days.map((day, i) => {
          if (!day.length) return null;
          const dateWithDaySet = usersTimezoneDate.add(i - 1, "day");
          return (
            <div
              key={i}
              className={classNames(
                "border-subtle overflow-hidden rounded-lg border-2",
                i !== 0 && "ml-[-4px]" // border-2 adds 4px to the width, and offsets the alignment
              )}>
              <div className="flex flex-none">
                {day.map((h) => {
                  const hours = Math.floor(h); // Whole number part
                  const fractionalHours = h - hours; // Decimal part

                  // Convert the fractional hours to minutes
                  const minutes = fractionalHours * 60;
                  const hourSet = dateWithDaySet.set("hour", h).set("minute", minutes);

                  const { isInRange, rangeOverlap = 0 } = isCurrentHourInRange({
                    dateRanges,
                    offset,
                    cellDate: hourSet,
                  });

                  const rangeGradients: {
                    backgroundGradient?: string;
                    textGradient?: string;
                    darkTextGradient?: string;
                  } = {};

                  if (isInRange && rangeOverlap) {
                    if (rangeOverlap < 0) {
                      const gradientValue = Math.abs(rangeOverlap);
                      rangeGradients.backgroundGradient = `linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) ${gradientValue}%, var(--cal-bg-success) ${gradientValue}%)`;

                      rangeGradients.textGradient = `linear-gradient(90deg, rgba(0,212,255,1) 0%, rgba(2,0,36,1) 100%, rgba(9,108,121,1) 100%)`;

                      rangeGradients.darkTextGradient = `linear-gradient(90deg, var(--cal-text-emphasis, #111827) ${
                        gradientValue === 50 ? "50%" : `${Math.round(gradientValue / 100) * 100}%`
                      }, var(--cal-text-inverted, white) 0%, var(--cal-text-inverted, white) 0%)`;
                    } else {
                      rangeGradients.backgroundGradient = `linear-gradient(90deg, var(--cal-bg-success) ${rangeOverlap}%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 0%)`;

                      rangeGradients.textGradient = `linear-gradient(90deg, rgba(0,212,255,1) 0%, rgba(2,0,36,1) 50%, rgba(9,108,121,1) 100%)`;

                      rangeGradients.darkTextGradient = `linear-gradient(90deg, var(--cal-text-inverted, white) ${
                        rangeOverlap === 50 ? "50%" : `${Math.round(rangeOverlap / 100) * 100}%`
                      }, var(--cal-text-emphasis, #111827) 0%, var(--cal-text-emphasis, #111827) 0%)`;
                    }
                  }

                  const TimeLabel = () => (
                    <>
                      {hourSet.format("H")}
                      {minutes !== 0 && (
                        <span className="align-text-top text-[.5rem]">{hourSet.format("mm")}</span>
                      )}
                    </>
                  );

                  return (
                    <div
                      key={h}
                      className={classNames(
                        "flex h-8 flex-col items-center justify-center",
                        isInRange ? "text-emphasis" : "",
                        isInRange && !rangeOverlap ? "bg-cal-success" : "",
                        hours ? "" : "bg-subtle font-medium"
                      )}
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={() => emitCellPosition(-1)}
                      style={{
                        width: `${DAY_CELL_WIDTH}px`,
                        backgroundImage: rangeGradients.backgroundGradient,
                      }}>
                      {hours ? (
                        <div title={hourSet.format("DD/MM HH:mm")}>
                          <div className="flex flex-col text-center text-xs font-bold leading-3 ">
                            {rangeGradients.textGradient ? (
                              <>
                                {/* light mode */}
                                <span className={classNames("font-bold dark:hidden")}>
                                  <TimeLabel />
                                </span>
                                {/* dark mode */}
                                <span
                                  style={{
                                    backgroundImage: rangeGradients.darkTextGradient,
                                  }}
                                  className={classNames(
                                    "hidden dark:block",
                                    rangeOverlap ? "bg-clip-text text-transparent" : ""
                                  )}>
                                  <TimeLabel />
                                </span>
                              </>
                            ) : (
                              <span>
                                <TimeLabel />
                              </span>
                            )}
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
            </div>
          );
        })}
      </div>
    </>
  );
}
