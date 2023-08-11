import { useContext } from "react";
import { useStore } from "zustand";

import dayjs from "@calcom/dayjs";
import { classNames } from "@calcom/lib";

import { DAY_CELL_WIDTH } from "../constants";
import { TBContext } from "../store";

interface TimeDialProps {
  timezone: string;
}

function isMidnight(h: number) {
  return h <= 5 || h >= 22;
}

function isNight(h: number) {
  return h <= 7 || h >= 18;
}

export function TimeDial({ timezone }: TimeDialProps) {
  const store = useContext(TBContext);
  if (!store) throw new Error("Missing BearContext.Provider in the tree");
  const getTzInfo = useStore(store, (s) => s.getTimezone);
  const tz = getTzInfo(timezone);

  if (!tz) return null;

  const { name, offset, abbr } = tz;

  const hours = Array.from({ length: 24 }, (_, i) => i + offset + 1);

  const days = [
    hours.filter((i) => i < 0).map((i) => (i + 24) % 24),
    hours.filter((i) => i >= 0 && i < 24),
    hours.filter((i) => i >= 24).map((i) => i % 24),
  ];

  const now = dayjs().tz(name);

  return (
    <>
      {timezone}
      <div className="flex select-none items-end overflow-auto text-sm">
        {days.map((day, i) => {
          if (!day.length) return null;
          return (
            <div key={i} className={classNames("flex flex-none overflow-hidden rounded-lg border border-2")}>
              {day.map((h) => {
                return (
                  <div
                    key={h}
                    className={classNames(
                      "flex h-8 flex-col items-center justify-center",
                      isMidnight(h) ? "" : "text-emphasis bg-success",
                      h ? "" : "bg-subtle font-medium"
                    )}
                    style={{
                      width: `${DAY_CELL_WIDTH}px`,
                    }}>
                    {h ? (
                      <div>{h}</div>
                    ) : (
                      <div className="flex flex-col text-center text-xs leading-3">
                        <span>{now.format("MMM")}</span>
                        <span>{now.format("D")}</span>
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
