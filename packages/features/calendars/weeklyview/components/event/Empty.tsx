import { useMemo } from "react";
import { shallow } from "zustand/shallow";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { classNames } from "@calcom/lib";

import { useCalendarStore } from "../../state/store";
import type { CalendarAvailableTimeslots } from "../../types/state";
import type { GridCellToDateProps } from "../../utils";
import { gridCellToDateTime } from "../../utils";

type EmptyCellProps = GridCellToDateProps & {
  isDisabled?: boolean;
  topOffsetMinutes?: number;
};

export function EmptyCell(props: EmptyCellProps) {
  const cellToDate = gridCellToDateTime({
    day: props.day,
    gridCellIdx: props.gridCellIdx,
    totalGridCells: props.totalGridCells,
    selectionLength: props.selectionLength,
    startHour: props.startHour,
  });

  const minuesFromStart =
    (cellToDate.toDate().getHours() - props.startHour) * 60 + cellToDate.toDate().getMinutes();

  return <Cell topOffsetMinutes={minuesFromStart} timeSlot={cellToDate} />;
}

type AvailableCellProps = {
  availableSlots: CalendarAvailableTimeslots;
  day: GridCellToDateProps["day"];
  startHour: GridCellToDateProps["startHour"];
};

export function AvailableCellsForDay({ availableSlots, day, startHour }: AvailableCellProps) {
  const slotsForToday = availableSlots && availableSlots[dayjs(day).format("YYYY-MM-DD")];

  const slots = useMemo(
    () =>
      slotsForToday?.map((slot) => ({
        slot,
        topOffsetMinutes: (slot.start.getHours() - startHour) * 60 + slot.start.getMinutes(),
      })),
    [slotsForToday, startHour]
  );

  if (!availableSlots) return null;

  return (
    <>
      {slots?.map((slot) => {
        return (
          <Cell
            key={slot.slot.start.toISOString()}
            timeSlot={dayjs(slot.slot.start)}
            topOffsetMinutes={slot.topOffsetMinutes}
          />
        );
      })}
    </>
  );
}

type CellProps = {
  isDisabled?: boolean;
  topOffsetMinutes?: number;
  timeSlot: Dayjs;
};

function Cell({ isDisabled, topOffsetMinutes, timeSlot }: CellProps) {
  const timeFormat = useTimePreferences((state) => state.timeFormat);
  const { onEmptyCellClick, hoverEventDuration } = useCalendarStore(
    (state) => ({
      onEmptyCellClick: state.onEmptyCellClick,
      hoverEventDuration: state.hoverEventDuration,
    }),
    shallow
  );

  return (
    <div
      className={classNames(
        "group flex w-[calc(100%-1px)] items-center justify-center",
        isDisabled && "pointer-events-none",
        !isDisabled && "bg-default dark:bg-muted",
        topOffsetMinutes && "absolute"
      )}
      data-disabled={isDisabled}
      data-slot={timeSlot.toISOString()}
      style={{
        height: `calc(${hoverEventDuration}*var(--one-minute-height))`,
        overflow: "visible",
        top: topOffsetMinutes ? `calc(${topOffsetMinutes}*var(--one-minute-height))` : undefined,
      }}
      onClick={() => onEmptyCellClick && onEmptyCellClick(timeSlot.toDate())}>
      {!isDisabled && hoverEventDuration !== 0 && (
        <div
          className={classNames(
            "opacity-4 bg-subtle hover:bg-emphasis text-emphasis dark:border-emphasis absolute hidden rounded-[4px] border-[1px] border-gray-900 px-[6px] py-1 text-xs font-semibold leading-5 group-hover:flex group-hover:cursor-pointer",
            hoverEventDuration && hoverEventDuration > 15 && "items-start pt-3",
            hoverEventDuration && hoverEventDuration < 15 && "items-center"
          )}
          style={{
            height: `calc(${hoverEventDuration}*var(--one-minute-height) - 2px)`,
            zIndex: 80,
            // @TODO: This used to be 90% as per Sean's work. I think this was needed when
            // multiple events are stacked next to each other. We might need to add this back later.
            width: "calc(100% - 2px)",
          }}>
          <div className="overflow-ellipsis leading-[0]">{timeSlot.format(timeFormat)}</div>
        </div>
      )}
    </div>
  );
}
