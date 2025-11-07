import React from "react";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";

import type { BorderColor } from "../../types/common";

type Props = {
  showBorder: boolean;
  borderColor: BorderColor;
  days: dayjs.Dayjs[];
  containerNavRef: React.RefObject<HTMLDivElement>;
};

export function DateValues({ showBorder, borderColor, days, containerNavRef }: Props) {
  const { i18n } = useLocale();
  const formatDate = (date: dayjs.Dayjs): string => {
    return new Intl.DateTimeFormat(i18n.language, { weekday: "short" }).format(date.toDate());
  };
  return (
    <div
      ref={containerNavRef}
      className={classNames(
        "bg-default dark:bg-default sticky top-[var(--calendar-dates-sticky-offset,0px)] z-[80] flex-none border-b sm:pr-8",
        borderColor === "subtle" ? "border-b-subtle" : "border-b-default",
        showBorder && (borderColor === "subtle" ? "border-r-subtle border-r" : "border-r-default border-r")
      )}>
      <div className="text-subtle flex leading-6 sm:hidden" data-dayslength={days.length}>
        {days.map((day) => {
          const isToday = dayjs().isSame(day, "day");
          return (
            <button
              key={day.toString()}
              type="button"
              className="flex flex-1 flex-col items-center pb-3 pt-2">
              {day.format("dd")}{" "}
              <span
                className={classNames(
                  "text-emphasis mt-1 flex h-8 w-8 items-center justify-center font-medium",
                  isToday && "bg-inverted text-inverted rounded-sm"
                )}>
                {day.format("D")}
              </span>
            </button>
          );
        })}
      </div>
      <div className="text-subtle -mr-px hidden auto-cols-fr leading-6 sm:flex">
        <div
          className={classNames(
            "col-end-1 w-16",
            showBorder &&
              (borderColor === "subtle" ? "border-l-subtle border-l" : "border-l-default border-l")
          )}
        />
        {days.map((day) => {
          const isToday = dayjs().isSame(day, "day");
          return (
            <div
              key={day.toString()}
              className={classNames(
                "flex flex-1 items-center justify-center py-3 text-xs font-medium uppercase",
                isToday && "text-default"
              )}>
              <span>
                {formatDate(day)}{" "}
                <span
                  className={classNames(
                    "items-center justify-center p-1",
                    isToday && "bg-brand-default text-brand rounded-md"
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
