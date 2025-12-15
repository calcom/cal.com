import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import classNames from "@calcom/ui/classNames";

import { useCalendarStore } from "../../state/store";
import type { SelectedTimeRange } from "../../types/state";

interface DragSelectOverlayProps {
  /** Days displayed in the calendar */
  days: dayjs.Dayjs[];
  /** Timezone for date formatting */
  timezone: string;
  /** Start hour of the calendar */
  startHour: number;
  /** Time format for display (e.g., "h:mma" or "HH:mm") */
  timeFormat?: string;
  /** Callback when a selected range is clicked (to remove it) */
  onRangeClick?: (id: string) => void;
}

/**
 * Overlay component for rendering drag selection preview and selected ranges.
 * Only renders when enableDragSelect is true.
 */
export function DragSelectOverlay({
  days,
  timezone,
  startHour,
  timeFormat = "h:mma",
  onRangeClick,
}: DragSelectOverlayProps) {
  const isDragging = useCalendarStore((state) => state.isDragging);
  const dragStart = useCalendarStore((state) => state.dragStart);
  const dragEnd = useCalendarStore((state) => state.dragEnd);
  const selectedRanges = useCalendarStore((state) => state.selectedRanges);

  // Grid layout constants (matching Calendar.tsx)
  const hourHeight = 58; // --gridDefaultSize
  // Note: time column is in a sibling div, so no offset needed for overlay calculations

  /**
   * Calculate overlay style for drag preview
   */
  const dragOverlayStyle = useMemo(() => {
    if (!isDragging || !dragStart || !dragEnd) return null;

    const startDay = Math.min(dragStart.day, dragEnd.day);
    const endDay = Math.max(dragStart.day, dragEnd.day);
    const startMinutes = Math.min(
      dragStart.hour * 60 + dragStart.minute,
      dragEnd.hour * 60 + dragEnd.minute
    );
    const endMinutes =
      Math.max(dragStart.hour * 60 + dragStart.minute, dragEnd.hour * 60 + dragEnd.minute) + 15;

    // Grid doesn't include time column, so calculate width as percentage of grid
    const cellWidthPercent = 100 / days.length;
    const left = `${startDay * cellWidthPercent}%`;
    const width = `${(endDay - startDay + 1) * cellWidthPercent}%`;
    const top = ((startMinutes - startHour * 60) / 60) * hourHeight;
    const height = ((endMinutes - startMinutes) / 60) * hourHeight;

    return {
      left,
      width,
      top: `${top}px`,
      height: `${height}px`,
    };
  }, [isDragging, dragStart, dragEnd, days.length, startHour, hourHeight]);

  /**
   * Calculate overlay style for a selected range
   */
  const getRangeStyle = (range: SelectedTimeRange) => {
    const rangeStart = dayjs(range.start).tz(timezone);
    const rangeEnd = dayjs(range.end).tz(timezone);

    // Find the day index
    const dayIdx = days.findIndex((d) => d.format("YYYY-MM-DD") === range.date);
    if (dayIdx === -1) return null;

    const startMinutes = rangeStart.hour() * 60 + rangeStart.minute();
    const endMinutes = rangeEnd.hour() * 60 + rangeEnd.minute();

    // Grid doesn't include time column, so calculate width as percentage of grid
    const cellWidthPercent = 100 / days.length;
    const left = `${dayIdx * cellWidthPercent}%`;
    const width = `calc(${cellWidthPercent}% - 2px)`;
    const top = ((startMinutes - startHour * 60) / 60) * hourHeight;
    const height = ((endMinutes - startMinutes) / 60) * hourHeight;

    return {
      left,
      width,
      top: `${top}px`,
      height: `${height}px`,
    };
  };

  return (
    <>
      {/* Drag selection preview overlay */}
      {isDragging && dragStart && dragEnd && dragOverlayStyle && (
        <div
          className="bg-brand-default/40 border-brand-default pointer-events-none absolute z-30 rounded border-2"
          style={dragOverlayStyle}
        />
      )}

      {/* Selected ranges overlay */}
      {selectedRanges?.map((range) => {
        const style = getRangeStyle(range);
        if (!style) return null;

        const rangeStart = dayjs(range.start).tz(timezone);
        const rangeEnd = dayjs(range.end).tz(timezone);

        return (
          <div
            key={range.id}
            className={classNames(
              "bg-brand-default/60 border-brand-default group absolute z-10 cursor-pointer rounded border",
              onRangeClick && "hover:bg-brand-default/80"
            )}
            style={style}
            onClick={(e) => {
              e.stopPropagation();
              onRangeClick?.(range.id);
            }}>
            <div className="text-brand p-1 text-xs font-medium">
              {rangeStart.format(timeFormat)} - {rangeEnd.format(timeFormat)}
            </div>
            {onRangeClick && (
              <div className="absolute right-1 top-1 hidden group-hover:block">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-brand h-3 w-3"
                  viewBox="0 0 20 20"
                  fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

