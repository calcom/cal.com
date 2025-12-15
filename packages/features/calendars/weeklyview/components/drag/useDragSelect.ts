import { useCallback, useRef } from "react";

import dayjs from "@calcom/dayjs";

import { useCalendarStore } from "../../state/store";
import type { CalendarEvent } from "../../types/events";
import type { DragPosition } from "../../types/state";

interface UseDragSelectOptions {
  /** Whether drag select is enabled */
  enabled: boolean;
  /** Timezone for date calculations */
  timezone: string;
  /** Start hour of the calendar */
  startHour: number;
  /** Duration for single-click selections (in minutes) */
  hoverEventDuration?: number;
  /** Days array from the calendar */
  days: dayjs.Dayjs[];
  /** Events to check for busy times */
  events?: CalendarEvent[];
}

interface UseDragSelectReturn {
  /** Ref to attach to the grid container */
  gridRef: React.RefObject<HTMLDivElement>;
  /** Mouse event handlers to spread on the grid container */
  handlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
  };
}

/**
 * Hook for handling drag-to-select functionality in the calendar.
 * Returns no-op handlers when disabled for backward compatibility.
 */
export function useDragSelect({
  enabled,
  timezone,
  startHour,
  hoverEventDuration = 30,
  days,
  events = [],
}: UseDragSelectOptions): UseDragSelectReturn {
  const gridRef = useRef<HTMLDivElement>(null);

  const setDragState = useCalendarStore((state) => state.setDragState);
  const isDragging = useCalendarStore((state) => state.isDragging);
  const dragStart = useCalendarStore((state) => state.dragStart);
  const dragEnd = useCalendarStore((state) => state.dragEnd);
  const onDragSelectComplete = useCalendarStore((state) => state.onDragSelectComplete);

  /**
   * Check if a position overlaps with a busy event
   */
  const isPositionBusy = useCallback(
    (dayIdx: number, hour: number, minute: number): boolean => {
      if (!events.length) return false;

      const dayDate = days[dayIdx];
      if (!dayDate) return false;

      const dateStr = dayDate.format("YYYY-MM-DD");
      const timeStr = `${dateStr} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
      const clickTime = dayjs.tz(timeStr, timezone);

      return events.some((event) => {
        const eventStart = dayjs(event.start).tz(timezone);
        const eventEnd = dayjs(event.end).tz(timezone);
        return (
          clickTime.isSame(eventStart) ||
          (clickTime.isAfter(eventStart) && clickTime.isBefore(eventEnd))
        );
      });
    },
    [events, days, timezone]
  );

  /**
   * Convert mouse position to grid cell coordinates
   */
  const getCellFromPosition = useCallback(
    (clientX: number, clientY: number): DragPosition => {
      if (!gridRef.current) return null;

      const rect = gridRef.current.getBoundingClientRect();

      // getBoundingClientRect() returns position relative to viewport,
      // which already accounts for scroll position. No need to add scrollTop.
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Grid doesn't include time column (it's in a sibling div), so no offset needed
      const cellWidth = rect.width / days.length;
      const hourHeight = 58; // --gridDefaultSize from Calendar.tsx

      // Calculate day index - no timeColumnWidth offset needed
      const day = Math.floor(x / cellWidth);
      if (day < 0 || day >= days.length) return null;

      // Calculate time
      const totalMinutes = (y / hourHeight) * 60 + startHour * 60;
      const hour = Math.floor(totalMinutes / 60);
      const minute = Math.floor((totalMinutes % 60) / 15) * 15; // Snap to 15-minute intervals

      if (hour < 0 || hour > 23) return null;

      return { day, hour, minute };
    },
    [days.length, startHour]
  );

  /**
   * Complete a drag selection and call the callback
   */
  const completeDragSelection = useCallback(() => {
    if (!dragStart || !dragEnd || !onDragSelectComplete) return;

    const startDay = Math.min(dragStart.day, dragEnd.day);
    const endDay = Math.max(dragStart.day, dragEnd.day);

    // Check if this is a single click (same position)
    const isSingleClick =
      dragStart.day === dragEnd.day &&
      dragStart.hour === dragEnd.hour &&
      dragStart.minute === dragEnd.minute;

    for (let d = startDay; d <= endDay; d++) {
      const dayDate = days[d];
      if (!dayDate) continue;

      const startMinutes =
        dragStart.day === d || startDay === endDay
          ? Math.min(dragStart.hour * 60 + dragStart.minute, dragEnd.hour * 60 + dragEnd.minute)
          : dragStart.hour * 60 + dragStart.minute;

      // For single clicks, use hoverEventDuration; for drags, use drag end + 15 min
      const endMinutes = isSingleClick
        ? startMinutes + hoverEventDuration
        : dragEnd.day === d || startDay === endDay
        ? Math.max(dragStart.hour * 60 + dragStart.minute, dragEnd.hour * 60 + dragEnd.minute) + 15
        : dragEnd.hour * 60 + dragEnd.minute + 15;

      // Build datetime in the target timezone
      const dateStr = dayDate.format("YYYY-MM-DD");
      const startHourCalc = Math.floor(startMinutes / 60);
      const startMinCalc = startMinutes % 60;
      const endHourCalc = Math.floor(endMinutes / 60);
      const endMinCalc = endMinutes % 60;

      const startTimeStr = `${dateStr} ${String(startHourCalc).padStart(2, "0")}:${String(startMinCalc).padStart(2, "0")}:00`;
      const endTimeStr = `${dateStr} ${String(endHourCalc).padStart(2, "0")}:${String(endMinCalc).padStart(2, "0")}:00`;

      const startTime = dayjs.tz(startTimeStr, timezone).toDate();
      const endTime = dayjs.tz(endTimeStr, timezone).toDate();

      // Don't select ranges in the past
      if (dayjs(endTime).isBefore(dayjs())) continue;

      onDragSelectComplete({
        day: dayDate.toDate(),
        start: startTime,
        end: endTime,
      });
    }
  }, [dragStart, dragEnd, days, timezone, hoverEventDuration, onDragSelectComplete]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled) return;

      const cell = getCellFromPosition(e.clientX, e.clientY);
      if (!cell) return;

      // Don't allow selection on busy times
      if (isPositionBusy(cell.day, cell.hour, cell.minute)) {
        return;
      }

      setDragState(true, cell, cell);
    },
    [enabled, getCellFromPosition, setDragState, isPositionBusy]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled || !isDragging) return;

      const cell = getCellFromPosition(e.clientX, e.clientY);
      if (cell && dragStart) {
        setDragState(true, dragStart, cell);
      }
    },
    [enabled, isDragging, getCellFromPosition, dragStart, setDragState]
  );

  const handleMouseUp = useCallback(() => {
    if (!enabled || !isDragging) return;

    completeDragSelection();
    setDragState(false, null, null);
  }, [enabled, isDragging, completeDragSelection, setDragState]);

  const handleMouseLeave = useCallback(() => {
    if (!enabled || !isDragging) return;

    // Complete the selection if mouse leaves while dragging
    completeDragSelection();
    setDragState(false, null, null);
  }, [enabled, isDragging, completeDragSelection, setDragState]);

  // Return no-op handlers when disabled for backward compatibility
  if (!enabled) {
    return {
      gridRef: { current: null } as React.RefObject<HTMLDivElement>,
      handlers: {
        onMouseDown: () => {},
        onMouseMove: () => {},
        onMouseUp: () => {},
        onMouseLeave: () => {},
      },
    };
  }

  return {
    gridRef,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
    },
  };
}

