"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";

import dayjs from "@calcom/dayjs";
import cn from "@calcom/ui/classNames";

import { buttonClasses } from "../../button/Button";
import { Icon } from "../../icon";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  variant?: "default" | "compact";
  accentColor?: string;
};

function Calendar({
  className,
  classNames,
  fromDate,
  toDate,
  showOutsideDays = true,
  variant = "default",
  accentColor,
  ...props
}: CalendarProps) {
  const isCompact = variant === "compact";
  const selectedStyles = getSelectedDayStyles(accentColor, isCompact);
  return (
    <DayPicker
      fromDate={fromDate}
      toDate={toDate || undefined}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: cn(
          "flex flex-col sm:flex-row",
          isCompact ? "space-y-3 sm:space-x-3 sm:space-y-0" : "space-y-4 sm:space-x-4 sm:space-y-0"
        ),
        month: cn(isCompact ? "space-y-3" : "space-y-4"),
        caption: "flex pt-1 relative items-center justify-between",
        caption_label: cn(isCompact ? "text-xs font-medium" : "text-sm font-medium"),
        nav: "flex items-center",
        head: "",
        head_row: "flex w-full items-center justify-between",
        head_cell: cn(
          "text-center text-default",
          isCompact ? "w-7 h-7 text-xs font-medium" : "w-8 md:w-11 h-8 text-sm font-medium"
        ),
        nav_button: cn(buttonClasses({ color: "minimal", variant: "icon" })),
        table: "w-full border-collapse space-y-1",
        row: "flex w-full mt-0.5 gap-0.5",
        cell: cn(
          "text-center p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          isCompact ? "w-7 h-7 text-xs" : "w-8 h-8 md:h-11 md:w-11 text-sm"
        ),
        day: cn(
          buttonClasses({ color: "minimal" }),
          "p-0 font-medium aria-selected:opacity-100 inline-flex items-center justify-center",
          isCompact ? "w-7 h-7 text-xs" : "w-8 h-8 md:h-11 md:w-11 text-sm"
        ),
        day_range_end: "hover:!bg-inverted hover:!text-inverted",
        day_range_start: "hover:!bg-inverted hover:!text-inverted",
        day_selected: isCompact ? "bg-emphasis text-default" : "bg-subtle text-default",
        day_today: "",
        day_outside: "",
        day_disabled: "text-muted opacity-50",
        day_range_middle: isCompact
          ? "aria-selected:bg-subtle aria-selected:text-default"
          : "aria-selected:bg-emphasis aria-selected:text-emphasis",
        day_hidden: "invisible",
        ...classNames,
      }}
      modifiersStyles={{
        selected: selectedStyles,
      }}
      components={{
        CaptionLabel: (capLabelProps) => (
          <div className="px-2">
            <span className="text-emphasis font-semibold leading-none">
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

function getSelectedDayStyles(accentColor: string | undefined, isCompact: boolean) {
  if (!accentColor) return undefined;
  const normalized = accentColor.trim();
  const bgColor = isCompact ? normalized : toRgbaIfHex(normalized, 0.2) || normalized;
  const textColor = getContrastTextColor(normalized);
  return {
    backgroundColor: bgColor,
    color: textColor,
  } as React.CSSProperties;
}

function toRgbaIfHex(color: string, alpha: number) {
  const hex = color.replace("#", "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) return null;
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getContrastTextColor(color: string) {
  const hex = color.replace("#", "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) {
    return "#FFFFFF";
  }
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}
