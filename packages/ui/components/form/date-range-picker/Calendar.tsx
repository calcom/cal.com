"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";

import dayjs from "@calcom/dayjs";
import { classNames as cn } from "@calcom/lib";

import { Icon } from "../../../index";
import { buttonClasses } from "../../button/Button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      fromDate={new Date()}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex pt-1 relative items-center justify-between",
        caption_label: "text-sm font-medium",
        nav: "flex items-center",
        head: "",
        head_row: "flex w-full items-center justify-between",
        head_cell: "w-8 md:w-11 h-8 text-sm font-medium text-default",
        nav_button: cn(buttonClasses({ color: "minimal", variant: "icon" })),
        table: "w-full border-collapse space-y-1",
        row: "flex w-full mt-2 gap-0.5",
        cell: "h-8 w-8 md:h-11 md:w-11 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonClasses({ color: "minimal" }),
          "w-8 h-8 md:h-11 md:w-11 p-0 text-sm font-medium aria-selected:opacity-100 inline-flex items-center justify-center"
        ),
        day_range_end: "day-range-end",
        day_selected: "bg-inverted text-inverted",
        day_today: "",
        day_outside: "",
        day_disabled: "text-muted opacity-50",
        day_range_middle: "aria-selected:bg-emphasis aria-selected:text-emphasis",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        CaptionLabel: (capLabelProps) => (
          <div className="px-2">
            <span className="text-emphasis leadning-none font-semibold">
              {dayjs(capLabelProps.displayMonth).format("MMMM")}{" "}
            </span>
            <span className="text-subtle font-medium leading-none">
              {dayjs(capLabelProps.displayMonth).format("YYYY")}
            </span>
          </div>
        ),
        IconLeft: () => <Icon name="chevron-left" className="h-4 w-4 stroke-2" />,
        IconRight: () => <Icon name="chevron-right" className="h-4 w-4 stroke-2" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
