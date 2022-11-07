import React, { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { classNames } from "@calcom/lib";

type Props = {
  days: dayjs.Dayjs[];
  containerNavRef: React.RefObject<HTMLDivElement>;
};

export function DateValues({ days, containerNavRef }: Props) {
  return (
    <div
      ref={containerNavRef}
      className="sticky top-0 z-30 flex-none bg-white shadow ring-1 ring-black ring-opacity-5 sm:pr-8">
      <div className="grid grid-cols-7 text-sm leading-6 text-gray-500 sm:hidden">
        {days.map((day) => {
          const isToday = dayjs().isSame(day, "day");
          return (
            <button key={day.toString()} type="button" className="flex flex-col items-center pt-2 pb-3">
              {day.format("dd")}{" "}
              <span
                className={classNames(
                  "mt-1 flex h-8 w-8 items-center justify-center font-semibold text-gray-900",
                  isToday && "rounded-full bg-gray-900 text-white"
                )}>
                {day.format("D")}
              </span>
            </button>
          );
        })}
      </div>
      <div className="-mr-px hidden grid-cols-7 divide-x divide-gray-100 border-r border-gray-100 text-sm leading-6 text-gray-500 sm:grid">
        <div className="col-end-1 w-14" />
        {days.map((day) => {
          const isToday = dayjs().isSame(day, "day");
          return (
            <div
              key={day.toString()}
              className={classNames("flex items-center justify-center py-3", isToday && "font-bold")}>
              <span>
                {day.format("ddd")}{" "}
                <span
                  className={classNames(
                    "items-center justify-center p-1",
                    isToday && "rounded-full bg-gray-900 text-white"
                  )}>
                  {day.format("DD")}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
